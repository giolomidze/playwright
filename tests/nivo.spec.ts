import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:5173/state-stuff');
  await page.getByText('Nivo Stuff').click();
  await page.locator('div:nth-child(2) > div > svg > g > g:nth-child(6) > rect').click();
  await page.getByText('Nivo Stuff').click();
});