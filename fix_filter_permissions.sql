-- Grant access to profiles, teams, and departments for authenticated users
-- This is required for the FilterDrawer to populate the lists

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view all teams"
ON teams FOR SELECT
TO authenticated
USING (true);

-- Departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view all departments"
ON departments FOR SELECT
TO authenticated
USING (true);
