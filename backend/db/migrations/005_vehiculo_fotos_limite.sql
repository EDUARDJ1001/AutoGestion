-- Limita a un maximo de 6 fotos por vehiculo a nivel de base de datos.
-- Idempotente: se puede re-ejecutar sin efectos secundarios.

CREATE OR REPLACE FUNCTION enforce_vehiculo_fotos_limite()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM vehiculo_fotos
    WHERE vehiculo_id = NEW.vehiculo_id
  ) >= 6 THEN
    RAISE EXCEPTION 'Un vehiculo no puede tener mas de 6 fotos'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vehiculo_fotos_limite ON vehiculo_fotos;

CREATE TRIGGER trg_vehiculo_fotos_limite
  BEFORE INSERT ON vehiculo_fotos
  FOR EACH ROW
  EXECUTE FUNCTION enforce_vehiculo_fotos_limite();
