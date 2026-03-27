import { test, expect } from '@playwright/test';
import mysql from 'mysql2/promise';

const E2E_DB_HOST = process.env.E2E_DB_HOST || process.env.MYSQL_HOST;
const E2E_DB_PORT = Number(process.env.E2E_DB_PORT || process.env.MYSQL_PORT || 3306);
const E2E_DB_USER = process.env.E2E_DB_USER || process.env.MYSQL_USER;
const E2E_DB_PASSWORD = process.env.E2E_DB_PASSWORD || process.env.MYSQL_PASSWORD;
const E2E_DB_NAME = process.env.E2E_DB_NAME || process.env.MYSQL_DATABASE;

async function getVerificationTokenByEmail(email: string): Promise<string | null> {
  if (!E2E_DB_HOST || !E2E_DB_USER || !E2E_DB_NAME) {
    return null;
  }

  const connection = await mysql.createConnection({
    host: E2E_DB_HOST,
    port: E2E_DB_PORT,
    user: E2E_DB_USER,
    password: E2E_DB_PASSWORD,
    database: E2E_DB_NAME
  });

  try {
    // Sequelize maps this model to the lowercase `employee` table, which matters on Linux CI.
    const [rows] = await connection.query(
      'SELECT verification_token FROM employee WHERE email = ? ORDER BY employeeID DESC LIMIT 1',
      [email]
    );

    const token = (rows as Array<{ verification_token: string | null }>)[0]?.verification_token;
    return token || null;
  } finally {
    await connection.end();
  }
}

async function waitForVerificationToken(email: string): Promise<string> {
  const maxAttempts = 12;
  const delayMs = 2_000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const token = await getVerificationTokenByEmail(email);
    if (token) {
      return token;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('Verification token was not found in time.');
}

test('account signup -> verify -> login -> add home -> add client', async ({ page }) => {
  test.skip(
    !E2E_DB_HOST || !E2E_DB_USER || !E2E_DB_NAME,
    'Set E2E_DB_* or MYSQL_* variables to enable token lookup from the verification email flow.'
  );

  const nonce = Date.now().toString(36).slice(-6);
  const company = `e2eco-${nonce}`;
  const firstName = 'E2E';
  const lastName = 'Admin';
  const username = `e2ea_${nonce}`;
  const email = `${username}@example.com`;
  const password = 'ValidPass123';

  await page.goto('/SignUp');

  await page.locator('input[name="firstNameField"]').fill(firstName);
  await page.locator('input[name="lastNameField"]').fill(lastName);
  await page.locator('input[name="usernameField"]').fill(username);
  await page.locator('input[name="emailField"]').fill(email);
  await page.locator('input[name="companyField"]').fill(company);
  await page.locator('input[name="passwordField"]').fill(password);
  await page.locator('input[name="confirmPasswordField"]').fill(password);
  const signupResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/auth/signup')
  );
  await page.getByTestId('signup-submit-button').click();

  const signupResponse = await signupResponsePromise;
  const signupPayload = await signupResponse.json();

  expect(signupPayload?.signupSuccess, `Signup failed: ${JSON.stringify(signupPayload)}`).toBe(true);

  await expect(page.getByText(/Registration Successful!/i)).toBeVisible({ timeout: 20_000 });

  const verificationToken = await waitForVerificationToken(email);
  await page.goto(`/verify-email?token=${verificationToken}`);
  await expect(page.getByText(/Email Verified Successfully!/i)).toBeVisible();

  await page.goto('/Login');
  await page.locator('input[name="usernameField"]').fill(username);
  await page.locator('input[name="passwordField"]').fill(password);
  await page.getByRole('main').getByRole('button', { name: 'Login' }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/Login'), { timeout: 15_000 });

  await page.goto('/Admin/manageHomes/add');
  const homeName = `E2E Home ${nonce}`;
  await page.locator('input[name="homeName"]').click();
  await page.locator('input[name="homeName"]').pressSequentially(homeName);
  await expect(page.locator('input[name="homeName"]')).toHaveValue(homeName);
  await page.locator('input[name="address"]').fill('123 Test Street');
  await page.locator('input[name="city"]').fill('Orlando');
  await page.locator('input[name="state"]').fill('FL');
  await page.locator('input[name="zip"]').fill('32801');
  await page.locator('input[name="capacity"]').fill('4');
  await page.getByRole('button', { name: 'Create Home' }).click();
  await page.getByTestId('confirm-action-button').click();
  await expect(page.getByText(/Home created successfully!/i)).toBeVisible();

  await page.goto('/Admin/manageClients/add');
  await page.locator('input[name="firstName"]').click();
  await page.locator('input[name="firstName"]').pressSequentially('Test');
  await expect(page.locator('input[name="firstName"]')).toHaveValue('Test');
  await page.locator('input[name="lastName"]').fill('Client');
  await page.locator('input[name="dateOfBirth"]').fill('1990-01-01');
  await page.locator('select[name="homeID"]').selectOption({ label: homeName });
  await page.locator('input[name="intakeDate"]').fill('2025-01-01');
  await page.locator('input[name="medicaidIdNumber"]').fill(`MD${nonce}`);
  await page.locator('input[name="behaviorPlanDueDate"]').fill('2025-01-31');
  await page.getByRole('button', { name: 'Create Client' }).click();
  await page.getByTestId('confirm-action-button').click();
  await expect(page.getByText(/Client created successfully!/i)).toBeVisible();
});
