#!/usr/bin/env node
// verify-quiz-setup.js
// ═════════════════════════════════════════════════════════════════════════════
// Verification script for EduSpark Quiz System setup
// Run: node verify-quiz-setup.js
// ═════════════════════════════════════════════════════════════════════════════

import process from 'process'
import { readFileSync } from 'fs'

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

const symbols = {
  pass: '✓',
  fail: '✗',
  warn: '⚠',
  info: 'ℹ',
}

function log(level, message) {
  const levels = {
    PASS: `${colors.green}${symbols.pass} PASS${colors.reset}`,
    FAIL: `${colors.red}${symbols.fail} FAIL${colors.reset}`,
    WARN: `${colors.yellow}${symbols.warn} WARN${colors.reset}`,
    INFO: `${colors.blue}${symbols.info} INFO${colors.reset}`,
  }
  console.log(`${levels[level]} ${message}`)
}

async function verify() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`)
  console.log(`${colors.cyan}  EduSpark Quiz System — Setup Verification${colors.reset}`)
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`)

  let passed = 0
  let failed = 0
  let warnings = 0

  // ── Check 1: Environment Variables ────────────────────────────────────────────
  console.log(`${colors.cyan}1. Environment Variables${colors.reset}`)

  const geminiKey = process.env.GEMINI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  if (geminiKey) {
    log('PASS', `GEMINI_API_KEY is set (${geminiKey.substring(0, 10)}...)`)
    passed++
  } else {
    log('FAIL', 'GEMINI_API_KEY is not set')
    failed++
  }

  if (anthropicKey) {
    log('PASS', `ANTHROPIC_API_KEY is set (${anthropicKey.substring(0, 10)}...)`)
    passed++
  } else {
    log('FAIL', 'ANTHROPIC_API_KEY is not set')
    failed++
  }

  if (!geminiKey && !anthropicKey) {
    log('FAIL', 'At least one provider API key is required!')
    console.log(`\n${colors.yellow}To fix:${colors.reset}`)
    console.log('  1. cp .env.example .env.local')
    console.log('  2. Add GEMINI_API_KEY from https://console.cloud.google.com')
    console.log('  3. Add ANTHROPIC_API_KEY from https://console.anthropic.com')
    console.log('  4. Re-run: node verify-quiz-setup.js\n')
  } else if (!geminiKey || !anthropicKey) {
    log('WARN', 'Only one provider configured. For redundancy, set both keys.')
    warnings++
  }

  // ── Check 2: File Structure ────────────────────────────────────────────────────
  console.log(`\n${colors.cyan}2. File Structure${colors.reset}`)

  const files = [
    'api/quiz.js',
    'api/lib/aiProvider.js',
    'api/lib/generateQuiz.js',
    'API_DOCUMENTATION.md',
    'QUIZ_SETUP.md',
  ]

  for (const file of files) {
    try {
      readFileSync(file)
      log('PASS', `Found ${file}`)
      passed++
    } catch {
      log('FAIL', `Missing ${file}`)
      failed++
    }
  }

  // ── Check 3: API Key Format ────────────────────────────────────────────────────
  console.log(`\n${colors.cyan}3. API Key Format${colors.reset}`)

  if (geminiKey) {
    if (geminiKey.startsWith('AIza')) {
      log('PASS', 'GEMINI_API_KEY has correct format (AIza...)')
      passed++
    } else {
      log('WARN', `GEMINI_API_KEY might be invalid (starts with ${geminiKey.substring(0, 4)}, expected AIza)`)
      warnings++
    }
  }

  if (anthropicKey) {
    if (anthropicKey.startsWith('sk-ant-')) {
      log('PASS', 'ANTHROPIC_API_KEY has correct format (sk-ant-...)')
      passed++
    } else {
      log('WARN', `ANTHROPIC_API_KEY might be invalid (starts with ${anthropicKey.substring(0, 7)}, expected sk-ant-)`)
      warnings++
    }
  }

  // ── Check 4: Code Quality ──────────────────────────────────────────────────────
  console.log(`\n${colors.cyan}4. Code Quality${colors.reset}`)

  try {
    const aiProvider = readFileSync('api/lib/aiProvider.js', 'utf-8')
    
    const checks = [
      { name: 'validateInput', found: aiProvider.includes('export function validateInput') },
      { name: 'buildPrompt', found: aiProvider.includes('export function buildPrompt') },
      { name: 'validateQuiz', found: aiProvider.includes('export function validateQuiz') },
      { name: 'checkProviderKeys', found: aiProvider.includes('export function checkProviderKeys') },
      { name: 'withTimeout', found: aiProvider.includes('export function withTimeout') },
    ]

    for (const check of checks) {
      if (check.found) {
        log('PASS', `aiProvider.js exports ${check.name}()`)
        passed++
      } else {
        log('FAIL', `aiProvider.js missing ${check.name}()`)
        failed++
      }
    }

    const generateQuiz = readFileSync('api/lib/generateQuiz.js', 'utf-8')
    
    const quizChecks = [
      { name: 'generateQuiz', found: generateQuiz.includes('export async function generateQuiz') },
      { name: 'callGemini', found: generateQuiz.includes('async function callGemini') },
      { name: 'callAnthropic', found: generateQuiz.includes('async function callAnthropic') },
      { name: 'withRetry', found: generateQuiz.includes('async function withRetry') },
    ]

    for (const check of quizChecks) {
      if (check.found) {
        log('PASS', `generateQuiz.js has ${check.name}()`)
        passed++
      } else {
        log('FAIL', `generateQuiz.js missing ${check.name}()`)
        failed++
      }
    }

  } catch (err) {
    log('FAIL', `Could not read code files: ${err.message}`)
    failed++
  }

  // ── Summary ────────────────────────────────────────────────────────────────────
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`)
  console.log(`${colors.cyan}Summary${colors.reset}`)
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`)
  console.log(`${colors.green}Passed:${colors.reset}  ${passed}`)
  console.log(`${colors.yellow}Warnings:${colors.reset} ${warnings}`)
  console.log(`${colors.red}Failed:${colors.reset}  ${failed}\n`)

  if (failed === 0 && warnings === 0) {
    console.log(`${colors.green}✓ Setup is complete and ready to use!${colors.reset}\n`)
    console.log(`${colors.cyan}Next steps:${colors.reset}`)
    console.log(`  1. Start development: npm run dev`)
    console.log(`  2. Test API: curl -X POST http://localhost:5173/api/quiz \\`)
    console.log(`     -H "Content-Type: application/json" \\`)
    console.log(`     -d '{"grade": 9, "subject": "Mathematics"}'`)
    console.log(`  3. Deploy to Vercel: git push origin main\n`)
    process.exit(0)
  } else if (failed === 0) {
    console.log(`${colors.yellow}⚠ Setup is mostly complete, but check warnings above${colors.reset}\n`)
    process.exit(0)
  } else {
    console.log(`${colors.red}✗ Setup is incomplete. Please fix the errors above.${colors.reset}\n`)
    console.log(`${colors.cyan}Troubleshooting:${colors.reset}`)
    console.log(`  • Missing files: Check out the repo properly`)
    console.log(`  • Missing env vars: Follow QUIZ_SETUP.md`)
    console.log(`  • Invalid key format: Check console.cloud.google.com and console.anthropic.com\n`)
    process.exit(1)
  }
}

verify().catch(err => {
  console.error(`${colors.red}Verification failed:${colors.reset}`, err.message)
  process.exit(1)
})
