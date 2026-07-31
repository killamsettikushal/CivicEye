/*
# Standardize report status values: in-progress → under_progress

## Problem
The reports table stored the "work started" status as `in-progress` (hyphen),
but the application is standardizing on `under_progress` (underscore) to match
the other snake_case status values and avoid URL/identifier issues.

## Changes
1. Migrate existing data: UPDATE reports SET status = 'under_progress' WHERE status = 'in-progress'
2. No schema changes — only a data update on the existing `status` text column.

## Security
- No RLS or policy changes.
- No structural changes to the table.
*/

UPDATE reports SET status = 'under_progress' WHERE status = 'in-progress';
