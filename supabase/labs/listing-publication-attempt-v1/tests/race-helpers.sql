-- NEW TESTS ONLY. Driver wraps in one outer BEGIN ... ROLLBACK.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'publication_disposable_helper_required';
 END IF;
END $gate$;
CREATE SCHEMA publication_test;
CREATE FUNCTION publication_test.check(label text,ok boolean) RETURNS text LANGUAGE plpgsql AS $fn$
BEGIN
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'publication_test_failed:%',label; END IF;
 RETURN 'PASS|'||label;
END $fn$;
CREATE FUNCTION publication_test.expect(label text,query text,expected_state text,expected_message text DEFAULT NULL,test_role text DEFAULT 'postgres')
RETURNS text LANGUAGE plpgsql AS $fn$
DECLARE got_state text; got_message text;
BEGIN
 EXECUTE format('SET LOCAL ROLE %I',test_role);
 BEGIN EXECUTE query;
 EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS got_state=RETURNED_SQLSTATE,got_message=MESSAGE_TEXT;
 END;
 RESET ROLE;
 RETURN publication_test.check(label,got_state=expected_state AND
   (expected_message IS NULL OR got_message=expected_message));
END $fn$;
CREATE FUNCTION publication_test.scalar_as(query text,test_role text) RETURNS bigint LANGUAGE plpgsql AS $fn$
DECLARE n bigint;
BEGIN EXECUTE format('SET LOCAL ROLE %I',test_role); EXECUTE query INTO n; RESET ROLE; RETURN n; END $fn$;


