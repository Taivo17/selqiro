-- Existing trigger identities, owners, grants and rows are retained. New typed
-- sends insert their validated snapshot explicitly in the same transaction.
CREATE OR REPLACE FUNCTION horse_publication_private.capture_message_card()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 RETURN NEW;
END $f$;

CREATE OR REPLACE FUNCTION service_publication_private.capture_message_card()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 RETURN NEW;
END $f$;

CREATE OR REPLACE FUNCTION jobs_private.capture_message_card()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
BEGIN
 RETURN NEW;
END $f$;
