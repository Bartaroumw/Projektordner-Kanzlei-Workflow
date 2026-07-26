UPDATE "AccountingPeriod" SET "processorSnapshot" = CASE "processorSnapshot"
  WHEN 'MA' THEN 'Mara Adler' WHEN 'MB' THEN 'Martin Bauer' WHEN 'MC' THEN 'Maria Conrad'
  WHEN 'MD' THEN 'Michael Danner' WHEN 'ME' THEN 'Marie Engel' WHEN 'MF' THEN 'Markus Fischer'
  WHEN 'MG' THEN 'Miriam Graf' WHEN 'MH' THEN 'Matthias Huber' WHEN 'MZ' THEN 'Marion Zeller'
  ELSE "processorSnapshot" END;

UPDATE "AccountingPeriod" SET "reviewerSnapshot" = CASE "reviewerSnapshot"
  WHEN 'PR' THEN 'Peter Roth' WHEN 'PS' THEN 'Paula Sommer' WHEN 'PT' THEN 'Paul Thiel'
  WHEN 'PU' THEN 'Petra Ulrich' WHEN 'PV' THEN 'Peter Vogel' WHEN 'PW' THEN 'Petra Wolf'
  WHEN 'PX' THEN 'Paul Xaver' WHEN 'PY' THEN 'Petra Young' WHEN 'MZ' THEN 'Marion Zeller'
  ELSE "reviewerSnapshot" END;

UPDATE "ChecklistTask" SET "processorInitials" = CASE "processorInitials"
  WHEN 'MA' THEN 'Mara Adler' WHEN 'MB' THEN 'Martin Bauer' WHEN 'MC' THEN 'Maria Conrad'
  WHEN 'MD' THEN 'Michael Danner' WHEN 'ME' THEN 'Marie Engel' WHEN 'MF' THEN 'Markus Fischer'
  WHEN 'MG' THEN 'Miriam Graf' WHEN 'MH' THEN 'Matthias Huber' WHEN 'MZ' THEN 'Marion Zeller'
  ELSE "processorInitials" END;

UPDATE "ChecklistTask" SET "reviewerInitials" = CASE "reviewerInitials"
  WHEN 'PR' THEN 'Peter Roth' WHEN 'PS' THEN 'Paula Sommer' WHEN 'PT' THEN 'Paul Thiel'
  WHEN 'PU' THEN 'Petra Ulrich' WHEN 'PV' THEN 'Peter Vogel' WHEN 'PW' THEN 'Petra Wolf'
  WHEN 'PX' THEN 'Paul Xaver' WHEN 'PY' THEN 'Petra Young' WHEN 'MZ' THEN 'Marion Zeller'
  ELSE "reviewerInitials" END;

UPDATE "WorkflowHistory" SET "actorInitials" = CASE "actorInitials"
  WHEN 'MA' THEN 'Mara Adler' WHEN 'MB' THEN 'Martin Bauer' WHEN 'MC' THEN 'Maria Conrad'
  WHEN 'MD' THEN 'Michael Danner' WHEN 'ME' THEN 'Marie Engel' WHEN 'MF' THEN 'Markus Fischer'
  WHEN 'MG' THEN 'Miriam Graf' WHEN 'MH' THEN 'Matthias Huber' WHEN 'MZ' THEN 'Marion Zeller'
  WHEN 'PR' THEN 'Peter Roth' WHEN 'PS' THEN 'Paula Sommer' WHEN 'PT' THEN 'Paul Thiel'
  WHEN 'PU' THEN 'Petra Ulrich' WHEN 'PV' THEN 'Peter Vogel' WHEN 'PW' THEN 'Petra Wolf'
  WHEN 'PX' THEN 'Paul Xaver' WHEN 'PY' THEN 'Petra Young'
  ELSE "actorInitials" END;

UPDATE "AccountingPeriod"
SET "managementNameSnapshot" = (
  SELECT "managementName" FROM "Client" WHERE "Client"."id" = "AccountingPeriod"."clientId"
)
WHERE "managementNameSnapshot" IS NULL;
