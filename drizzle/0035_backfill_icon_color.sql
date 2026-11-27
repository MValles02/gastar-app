-- Backfill: every category and account gets an icon and a colour (data only, no DDL, no NOT NULL).
-- Only blank (null/empty/whitespace) values change; non-blank values and updated_at are untouched.
-- Categories: name (lowercased, trimmed, accents stripped) looked up in a catalogue for icon/colour;
--   no match: icon 'tag', colour deterministic from the id (md5 into the 16 SWATCHES).
-- Accounts: icon 'dollar' for USD, else 'wallet'; colour deterministic from the id.
-- Idempotent. The previous release can still insert null icons during the start-first deploy window,
-- so the phase 9 migration that adds NOT NULL must re-run this same backfill right before it.
WITH catalogue(name, icon, color) AS (
	VALUES
		('supermercado', 'cart', 'orange'), ('super', 'cart', 'orange'), ('almacen', 'cart', 'orange'), ('verduleria', 'cart', 'orange'),
		('comida', 'food', 'amber'), ('comidas', 'food', 'amber'), ('restaurante', 'food', 'amber'), ('restaurantes', 'food', 'amber'), ('delivery', 'food', 'amber'),
		('transporte', 'transport', 'ochre'), ('colectivo', 'transport', 'ochre'), ('subte', 'transport', 'ochre'), ('taxi', 'transport', 'ochre'), ('uber', 'transport', 'ochre'),
		('auto', 'car', 'slate'), ('nafta', 'car', 'slate'), ('combustible', 'car', 'slate'), ('estacionamiento', 'car', 'slate'), ('peaje', 'car', 'slate'),
		('alquiler', 'home', 'violet'), ('hogar', 'home', 'violet'), ('casa', 'home', 'violet'), ('expensas', 'home', 'violet'),
		('salud', 'health', 'green'), ('farmacia', 'health', 'green'), ('medicamentos', 'health', 'green'), ('prepaga', 'health', 'green'), ('obra social', 'health', 'green'),
		('educacion', 'education', 'indigo'), ('colegio', 'education', 'indigo'), ('cursos', 'education', 'indigo'), ('universidad', 'education', 'indigo'),
		('salidas', 'entertainment', 'plum'), ('entretenimiento', 'entertainment', 'plum'), ('ocio', 'entertainment', 'plum'), ('streaming', 'entertainment', 'plum'), ('suscripciones', 'entertainment', 'plum'),
		('regalos', 'gift', 'red'),
		('viajes', 'travel', 'sky'), ('vacaciones', 'travel', 'sky'),
		('servicios', 'services', 'blue'), ('luz', 'services', 'blue'), ('gas', 'services', 'blue'), ('agua', 'services', 'blue'), ('internet', 'services', 'blue'), ('telefono', 'services', 'blue'), ('celular', 'services', 'blue'),
		('ropa', 'clothing', 'pink'), ('indumentaria', 'clothing', 'pink'),
		('mascotas', 'pets', 'brown'), ('veterinaria', 'pets', 'brown'),
		('sueldo', 'salary', 'teal'), ('salario', 'salary', 'teal'), ('ingresos', 'salary', 'teal'),
		('freelance', 'salary', 'blue'), ('honorarios', 'salary', 'blue')
)
UPDATE categories c
SET
	icon = CASE WHEN coalesce(trim(c.icon), '') = '' THEN coalesce(k.icon, 'tag') ELSE c.icon END,
	color = CASE WHEN coalesce(trim(c.color), '') = '' THEN coalesce(k.color, (ARRAY['green','teal','sky','blue','indigo','violet','plum','pink','red','orange','amber','ochre','olive','brown','slate','gray'])[1 + (('x' || substr(md5(c.id::text), 1, 7))::bit(28)::int % 16)]) ELSE c.color END
FROM categories s
LEFT JOIN catalogue k ON k.name = translate(lower(trim(s.name)), 'áéíóúüñ', 'aeiouun')
WHERE s.id = c.id AND (coalesce(trim(c.icon), '') = '' OR coalesce(trim(c.color), '') = '');
--> statement-breakpoint
UPDATE financial_accounts
SET
	icon = CASE WHEN coalesce(trim(icon), '') = '' THEN CASE currency WHEN 'USD' THEN 'dollar' ELSE 'wallet' END ELSE icon END,
	color = CASE WHEN coalesce(trim(color), '') = '' THEN (ARRAY['green','teal','sky','blue','indigo','violet','plum','pink','red','orange','amber','ochre','olive','brown','slate','gray'])[1 + (('x' || substr(md5(id::text), 1, 7))::bit(28)::int % 16)] ELSE color END
WHERE coalesce(trim(icon), '') = '' OR coalesce(trim(color), '') = '';
