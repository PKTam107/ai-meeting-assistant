-- AlterEnum
-- "READY" sits between PROCESSING and TRANSCRIBED: the media has been
-- inspected (duration known) but nothing has transcribed it yet.
ALTER TYPE "MeetingStatus" ADD VALUE 'READY' AFTER 'PROCESSING';
