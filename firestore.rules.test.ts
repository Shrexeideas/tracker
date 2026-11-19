import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const blueprint = JSON.parse(fs.readFileSync(path.resolve('firebase-blueprint.json'), 'utf-8'));
const rulesText = fs.readFileSync(path.resolve('firestore.rules'), 'utf-8');

test('firestore.rules uses rules_version 2 and default-deny safety net', () => {
  assert.match(rulesText, /rules_version\s*=\s*'2';/);
  assert.match(rulesText, /match\s*\/\{document=\*\*\}\s*\{\s*allow read, write:\s*if false;\s*\}/);
});

test('every collection in firebase-blueprint.json has a matching rule block', () => {
  const paths = Object.keys(blueprint.firestore || {});
  assert.ok(paths.length >= 18);
  for (const p of paths) {
    const segments = p.split('/').filter(Boolean);
    const leafCollection = segments.length > 2 ? segments[2] : null;
    if (leafCollection) {
      assert.match(
        rulesText,
        new RegExp(`match\\s+\\/${leafCollection}\\/\\{`),
        `Missing match block for ${p}`
      );
    } else {
      assert.match(rulesText, /match\s+\/users\/\{userId\}/);
    }
  }
});

test('all writes enforce verified owner, path ID hardening, and temporal integrity', () => {
  assert.match(rulesText, /function isVerifiedOwner\(userId\)/);
  assert.match(rulesText, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesText, /function isValidId\(id\)/);
  assert.match(rulesText, /function isValidTimestampCreate\(data\)/);
  assert.match(rulesText, /function isValidTimestampUpdate\(data\)/);
  assert.doesNotMatch(rulesText, /allow\s+(read|list):\s*if\s+isSignedIn\(\)\s*;/);
});

test('every update block checks affectedKeys().hasOnly and immutable userId', () => {
  const updateMatches = rulesText.match(/allow update:/g) || [];
  const hasOnlyMatches = rulesText.match(/affectedKeys\(\)\.hasOnly\(/g) || [];
  const userIdImmutableMatches = rulesText.match(/incoming\(\)\.userId == existing\(\)\.userId/g) || [];
  assert.ok(updateMatches.length >= 18);
  assert.ok(hasOnlyMatches.length >= updateMatches.length);
  assert.ok(userIdImmutableMatches.length >= updateMatches.length);
});
