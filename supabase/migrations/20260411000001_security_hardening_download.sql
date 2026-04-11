-- Security hardening: atomic download increment RPC

CREATE OR REPLACE FUNCTION atomic_increment_download(
    p_submission_id UUID,
    p_earnings_per_download INT
) RETURNS INT AS $func$
DECLARE
    v_new_count INT;
    v_owner_id UUID;
BEGIN
    UPDATE mod_submissions
       SET download_count = download_count + 1
     WHERE id = p_submission_id
    RETURNING download_count, user_id INTO v_new_count, v_owner_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Submission not found';
    END IF;

    UPDATE user_profiles
       SET earnings_balance = earnings_balance + p_earnings_per_download
     WHERE id = v_owner_id;

    RETURN v_new_count;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;
