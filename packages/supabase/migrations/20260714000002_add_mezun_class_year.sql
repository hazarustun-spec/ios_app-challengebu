-- Add "Mezun" (alumni) as a class_year option — the onboarding "Sınıfın"
-- step was missing an option for alumni university accounts, who are
-- neither an undergrad year nor a graduate-program student.
alter type class_year add value 'mezun';
