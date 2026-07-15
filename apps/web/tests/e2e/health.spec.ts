import { test, expect } from '@playwright/test'

test('smoke test: login page loads', async ({ page }) => {
  await page.goto('/login')
  const heading = page.locator('h2')
  await expect(heading).toContainText('Sign in to your account')
})

test('smoke test: register page loads', async ({ page }) => {
  await page.goto('/register')
  const heading = page.locator('h2')
  await expect(heading).toContainText('Create your account')
})

test('smoke test: redirect unauthenticated to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/login')
})
