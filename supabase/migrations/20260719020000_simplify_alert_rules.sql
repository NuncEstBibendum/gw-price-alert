-- Direction was always redundant with type: a buy rule only ever makes
-- sense as "alert when price drops below threshold", and a sell rule as
-- "alert when price rises above threshold". Drop the column and let the
-- application derive the comparison from type instead.
alter table alert_rules drop column direction;
drop type alert_direction;
