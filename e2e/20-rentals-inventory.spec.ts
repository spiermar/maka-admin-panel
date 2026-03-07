import { sql } from '@vercel/postgres';
import { expect, test } from './fixtures';
import { login } from './helpers/auth';

interface SeededRentals {
  unit101Id: number;
  unit102Id: number;
}

async function ensureRentalsSchema(): Promise<void> {
  await sql.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unit_status') THEN
        CREATE TYPE unit_status AS ENUM ('Occupied', 'Vacant', 'Unavailable');
      END IF;
    END $$;
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS properties (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS units (
      id SERIAL PRIMARY KEY,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      unit_number VARCHAR(50) NOT NULL,
      building_label VARCHAR(100),
      unit_type VARCHAR(100) NOT NULL,
      bedrooms DECIMAL(4,1) NOT NULL CHECK (bedrooms >= 0),
      bathrooms DECIMAL(4,1) NOT NULL CHECK (bathrooms >= 0),
      status unit_status NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (property_id, unit_number)
    );
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS unit_occupancy_statuses (
      id SERIAL PRIMARY KEY,
      unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
      status unit_status NOT NULL CHECK (status IN ('Occupied', 'Vacant', 'Unavailable')),
      effective_date DATE NOT NULL,
      unavailable_reason TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (unit_id, effective_date),
      CHECK (
        (status = 'Unavailable') OR unavailable_reason IS NULL
      )
    );
  `);
}

async function seedRentalsInventory(): Promise<SeededRentals> {
  await ensureRentalsSchema();
  await sql`DELETE FROM unit_occupancy_statuses`;
  await sql`DELETE FROM units`;
  await sql`DELETE FROM properties`;

  const oak = await sql`INSERT INTO properties (name) VALUES ('Oak Court') RETURNING id`;
  const pine = await sql`INSERT INTO properties (name) VALUES ('Pine Homes') RETURNING id`;

  const unit101 = await sql`
    INSERT INTO units (property_id, unit_number, unit_type, bedrooms, bathrooms, status, building_label)
    VALUES (${oak.rows[0].id}, '101', 'Apartment', 2, 1, 'Vacant', 'A')
    RETURNING id
  `;
  const unit102 = await sql`
    INSERT INTO units (property_id, unit_number, unit_type, bedrooms, bathrooms, status, building_label)
    VALUES (${oak.rows[0].id}, '102', 'Apartment', 3, 2, 'Occupied', 'A')
    RETURNING id
  `;
  const unit201 = await sql`
    INSERT INTO units (property_id, unit_number, unit_type, bedrooms, bathrooms, status, building_label)
    VALUES (${pine.rows[0].id}, '201', 'Townhome', 2, 1.5, 'Vacant', 'B')
    RETURNING id
  `;
  const unit202 = await sql`
    INSERT INTO units (property_id, unit_number, unit_type, bedrooms, bathrooms, status, building_label)
    VALUES (${pine.rows[0].id}, '202', 'Townhome', 1, 1, 'Unavailable', 'B')
    RETURNING id
  `;

  await sql`
    INSERT INTO unit_occupancy_statuses (unit_id, status, effective_date, unavailable_reason)
    VALUES
      (${unit101.rows[0].id}, 'Vacant', CURRENT_DATE - INTERVAL '2 day', NULL),
      (${unit102.rows[0].id}, 'Occupied', CURRENT_DATE - INTERVAL '3 day', NULL),
      (${unit102.rows[0].id}, 'Unavailable', CURRENT_DATE + INTERVAL '8 day', 'Renovation'),
      (${unit201.rows[0].id}, 'Vacant', CURRENT_DATE - INTERVAL '1 day', NULL),
      (${unit202.rows[0].id}, 'Unavailable', CURRENT_DATE - INTERVAL '1 day', 'Turnover')
  `;

  return {
    unit101Id: Number(unit101.rows[0].id),
    unit102Id: Number(unit102.rows[0].id),
  };
}

test.describe('Rentals Inventory', () => {
  let seeded: SeededRentals;

  test.beforeEach(async ({ page }) => {
    seeded = await seedRentalsInventory();
    await login(page);
    await page.goto('/rentals?lang=en');
    await page.waitForLoadState('networkidle');
  });

  test('shows grouped inventory defaults with property/status/search filters and non-persistent state', async ({
    page,
  }) => {
    await expect(page.getByRole('heading', { name: 'Rentals' })).toBeVisible();
    await expect(page.getByTestId('inventory-group-Vacant')).toBeVisible();
    await expect(page.getByTestId('inventory-group-Occupied')).toBeVisible();
    await expect(page.getByTestId('inventory-group-Unavailable')).toBeVisible();

    const vacantRows = page.locator('[data-testid="inventory-group-Vacant"] tbody tr');
    await expect(vacantRows).toHaveCount(2);
    await expect(vacantRows.nth(0)).toContainText('Oak Court');
    await expect(vacantRows.nth(0)).toContainText('101');
    await expect(vacantRows.nth(1)).toContainText('Pine Homes');
    await expect(vacantRows.nth(1)).toContainText('201');

    await page.getByTestId('inventory-filter-property').click();
    await page.getByRole('option', { name: 'Pine Homes' }).click();
    await expect(page.locator('[data-testid^="inventory-row-"]')).toHaveCount(2);

    await page.getByTestId('inventory-filter-status').click();
    await page.getByRole('option', { name: 'Unavailable' }).click();
    await expect(page.locator('[data-testid^="inventory-row-"]')).toHaveCount(1);
    await expect(page.locator('[data-testid^="inventory-row-"]').first()).toContainText('202');

    await page.getByTestId('inventory-filter-search').fill('does-not-exist');
    await expect(page.getByText('No units match the selected filters.')).toBeVisible();
    await expect(page.locator('[data-testid^="inventory-group-"]')).toHaveCount(0);

    await page.getByRole('link', { name: /dashboard/i }).click();
    await page.waitForURL('/?lang=en');
    await page.getByRole('link', { name: /rentals/i }).click();
    await page.waitForURL('/rentals?lang=en');

    await expect(page.getByTestId('inventory-filter-search')).toHaveValue('');
    await expect(page.locator('[data-testid^="inventory-row-"]')).toHaveCount(4);
  });

  test('uses row-click detail then full-page edit and silently discards unsaved changes', async ({
    page,
  }) => {
    let dialogSeen = false;
    page.on('dialog', async (dialog) => {
      dialogSeen = true;
      await dialog.dismiss();
    });

    await page.getByTestId(`inventory-row-${seeded.unit102Id}`).click();
    await page.waitForURL(`/rentals/units/${seeded.unit102Id}?lang=en`);
    await expect(page.getByText('Current status')).toBeVisible();
    await expect(page.getByText('Occupied')).toBeVisible();
    await expect(page.getByText('Next scheduled status')).toBeVisible();
    await expect(page.getByText('Unavailable')).toBeVisible();

    await page.getByTestId('unit-detail-edit-link').click();
    await page.waitForURL(`/rentals/units/${seeded.unit102Id}/edit?lang=en`);
    await expect(page.getByTestId('unit-form-unit-number')).toHaveValue('102');

    await page.getByTestId('unit-form-unit-number').fill('102X');
    await page.getByTestId('unit-form-cancel').click();
    await page.waitForURL(`/rentals/units/${seeded.unit102Id}?lang=en`);

    await page.getByTestId('unit-detail-edit-link').click();
    await page.waitForURL(`/rentals/units/${seeded.unit102Id}/edit?lang=en`);
    await expect(page.getByTestId('unit-form-unit-number')).toHaveValue('102');
    expect(dialogSeen).toBe(false);

    await page.getByTestId('unit-form-cancel').click();
    await page.waitForURL(`/rentals/units/${seeded.unit102Id}?lang=en`);
    await page.goto('/rentals?lang=en');
    await page.getByTestId(`inventory-row-${seeded.unit101Id}`).click();
    await page.waitForURL(`/rentals/units/${seeded.unit101Id}?lang=en`);
    await expect(page.getByText('Current status')).toBeVisible();
    await expect(page.getByText('Vacant')).toBeVisible();
  });
});
