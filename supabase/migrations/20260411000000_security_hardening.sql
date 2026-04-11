-- Security hardening: atomic RPCs
-- Must run before the DDL migration that references the RPCs.

CREATE OR REPLACE FUNCTION atomic_deduct_tokens(
    p_user_id UUID,
    p_amount INT,
    p_reason TEXT
) RETURNS INT AS $func$
DECLARE
    v_new_balance INT;
BEGIN
    UPDATE user_profiles
       SET token_balance = token_balance - p_amount
     WHERE id = p_user_id
       AND token_balance >= p_amount
    RETURNING token_balance INTO v_new_balance;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient tokens';
    END IF;

    INSERT INTO token_transactions (user_id, amount, reason)
    VALUES (p_user_id, -p_amount, p_reason);

    RETURN v_new_balance;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;
