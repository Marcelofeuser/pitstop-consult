/*
# Allow role selection at signup

## Changes
- Updates the `handle_new_user()` trigger to read the `role` field from
  `raw_user_meta_data` instead of always defaulting to 'cliente'.
- If no role is provided or the value is invalid, defaults to 'cliente'.
- This allows the consultor to select "consultor" during signup.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'cliente');
  IF v_role NOT IN ('consultor', 'cliente') THEN
    v_role := 'cliente';
  END IF;

  INSERT INTO public.usuarios (id, email, nome, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    v_role
  )
  ON CONFLICT (id) DO UPDATE
  SET nome = COALESCE(NEW.raw_user_meta_data->>'nome', usuarios.nome),
      role = v_role;

  RETURN NEW;
END;
$$;
