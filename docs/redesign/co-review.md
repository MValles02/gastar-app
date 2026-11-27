# Co-review mobile — gastar-app (develop @ ef24cc7, 2026-11-27)

Viewport 375x812, dark. Local dev, seed user demo@gastar.local.
Formato: `[pantalla] — nota (autor) — prioridad`

## 1. Login (/login)

- [ ] **A1 — Centrar auth verticalmente** (acordado) — alta. Todas las pantallas de `AuthPage` (ingresar, crear cuenta, recuperar, nueva contraseña, enlace vencido, revisá tu email) vuelven a ir centradas en la pantalla, manteniendo banda esmeralda + card superpuesta del #495.
- [ ] **A2 — Banda que corta + card montada** → no es de auth, es el patrón de toda la app (Inicio, Plan…). Revisar cuando lleguemos a Inicio.
- [ ] **A3 — Tab inactiva del segmentado en blanco** (acordado) — baja. Hoy usa gris (muted-foreground); pasa a blanco (foreground). La activa se sigue distinguiendo por el fondo oscuro.
- [ ] **A4 — Logo de Google en "Continuar con Google"** (Mateo) — media. `GoogleButton.svelte`: agregar el logo "G" oficial a color (guía de marca de Google) a la izquierda del texto. Nota: el botón no se eliminó; solo se muestra si están `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` (`googleEnabled`), y en local no aparece. Para revisarlo visualmente hay que configurar esas vars en local o forzarlo en dev.

## 2. Crear cuenta (/signup)

- Aplica todo lo de Login (A1 centrado, A3 tab blanca, A4 logo Google). Sin notas propias.

## 3. Inicio

- [ ] **I1 — 3 propuestas de Inicio en un artifact** (Mateo) — estilos distintos, moderno/minimalista. Decide el corte de banda (A2). Canvas: https://claude.ai/artifact/Rhn3LKGsWWTN5q5y3wHpf6 (A Banda completa · B Monolito · C Bento · D combinada). Elegida dirección D: encabezado + disponible de B (sin banda, todo oscuro, número grande, ARS/USD, sparkline, pill centrada) y de Saldo total para abajo las tarjetas de C (Saldo/Resultado lado a lado, pagos fijos con anillo, categorías con barra apilada). Resuelve A2 (sin banda). **D confirmada** (sin pills, tiles compactos, + "Últimos movimientos" con "Ver todos"). El canvas D es la referencia para implementar.
- [ ] **I2 — Próximos vencimientos: quitar el texto descriptivo** ("Pagaste todos los pagos fijos…"); quedan barra y números. — media
- [ ] **I3 — Quitar ambas pills** ("Vas bien" y "$X por debajo/encima del ritmo") de Inicio y de todos lados. El estado se lee por el color de la curva vs. la línea del ritmo. — media
- [x] ~~Barra inferior tapa contenido~~ → descartado: al scrollear se ve bien; la barra queda siempre visible.
- [x] ~~Enter no envía login~~ → descartado: en el celular siempre se usa el botón.
- [ ] **I9 — Rótulo "Disponible" sin el mes** (Mateo): la fecha ya está arriba. — baja
- [ ] **I4 — Símbolo de moneda del mismo tamaño que los números** (Mateo) — revertir el `$` chico/superíndice a como estaba antes. — media
- [ ] **I5 — Quitar "X por día · quedan Y días"** (Mateo) de Inicio y de cualquier otro lugar de la app donde aparezca. — media. Candidatos (grep "por día"/daysLeft): `(app)/+page.svelte`, `plan/+page.svelte`, `plan/SavingsOptions.svelte`, `plan/setup`, `plan/savings/SavingsScreen.svelte`, `FirstRunChecklist.svelte`, `server/plan/{summary,month-plan,alerts}.ts`, `server/dashboard/home.ts`, `lib/plan.ts`. Revisar en Plan si el ritmo diario es útil allí antes de quitarlo.
- [ ] **I6 — "Saldo total" clickeable → Cuentas** (Mateo), para ver cómo se reparte. — media
- [ ] **I7 — "Pagaste X de Y" clickeable → detalle del plan** (Mateo). — media
- [ ] **I10 — Sin signos +/− en montos, en toda la app** (Mateo) — media. El tipo se identifica por color: verde = ingreso, rojo = gasto, foreground (blanco/negro según tema) = neutral. Aplica a Resultado, movimientos y cualquier lista de montos. En el canvas D se agregó "Últimos movimientos" (6 filas + "Ver todos").
- [ ] **I11 — Pill genérica "N movimientos pendientes"** (Mateo) — media. Reemplaza la pill "MP" (`routes/(app)/MpPill.svelte`): el conteo `importsPending` del server ya suma MP, Galicia y Gmail, así que solo cambia la UI. Va bajo el saludo, con punto esmeralda y ›, y lleva a /imports. En el canvas D ya está agregada. Con 0 pendientes la pill se oculta (acordado), y desaparece el estado "al día".
- [ ] **I8 — Categorías de "Gastos de noviembre" clickeables → detalle de la categoría** (Mateo). — media

## Regla de diseño (acordada)
Cada pantalla adopta el estilo visual de Inicio D: oscuro y sin banda esmeralda, rótulos en mayúsculas espaciadas, tiles compactos `surface` de 20px de radio, links con ↗/›, y montos sin signo con color por tipo. Al llegar a cada pantalla hacemos su artifact antes de anotarla como cerrada. Todas las pantallas van en el mismo canvas (https://claude.ai/artifact/Rhn3LKGsWWTN5q5y3wHpf6).
**Formas (acordado):** todo lo que contiene un ícono, avatar, botón, pill, punto o segmentado es un círculo o una cápsula (radio 999px). Los contenedores (cards, grupos de filas, tiles) llevan radio de 20px. No quedan cuadrados ni radios intermedios.

## 4. Perfil (/profile)
- [ ] **P1 — Rediseño en estilo D, aprobado** (canvas: tablero "Perfil"). Lleva botón de volver circular, avatar grande y grupos con rótulo (DATOS: Cuentas, Categorías, Vinculaciones · CUENTA: Nombre, Contraseña · APARIENCIA: segmentado de tema). Cerrar sesión y Darme de baja quedan en un grupo final, con la baja en rojo. Íconos en círculos; el segmentado de tema tiene las opciones inactivas en blanco (A3).

## Mapa de flujos de la app
Rutas reales de `src/routes`. Las sheets se abren sobre la pantalla actual con `openShallow` y también existen como página propia.

- **Auth:** login · signup · verify-email (revisá tu email) · forgot-password · reset-password (nueva / enlace vencido) · Google (con env).
- **Primer uso:** FirstRunChecklist → accounts/new · movements/new · plan/setup.
- **Movimientos:** /movements (mes, filtros, moneda) · movements/new (sheet: gasto, ingreso, transferencia, cotización) · movements/[id] (sheet: detalle, editar, borrar).
- **Cuentas:** /accounts · accounts/new · accounts/[id] (detalle, editar, archivar).
- **Categorías:** /categories · categories/new · categories/[id].
- **Plan:** /plan · plan/setup · plan/limits/new · plan/limits/[categoryId] · plan/recurring/new (ingreso o gasto) · plan/recurring/[id] (sheet) · plan/savings · plan/rate.
- **Reportes:** /reports.
- **Avisos:** /notifications.
- **Importaciones:** /imports (pendientes, "Aprobar N sugeridos") · imports/[id] (revisar) · imports/auto.
- **Perfil / Ajustes:** /profile · profile/password · profile/vinculaciones → profile/mercado-pago · profile/gmail → profile/gmail/cards/[card] · profile/galicia · profile/delete.

## Recorrido desde Inicio (orden de review)
De arriba hacia abajo, cada destino con su subflujo:

1. **Avatar → Perfil** (/profile y sus subpantallas: contraseña, vinculaciones MP/Gmail/Galicia, borrar cuenta)
2. **Campana → Avisos** (/notifications)
3. **Pill MP → Importaciones** (/imports → imports/[id] → imports/auto)
4. **ARS/USD**: cambio de moneda en el lugar, sin pantalla propia
5. **Saldo total → Cuentas** (I6: /accounts → accounts/[id] → accounts/new)
6. **Pagos fijos → Plan** (I7: /plan y sus subpantallas; vencimientos → plan/recurring/[id])
7. **Gastos: Ver reportes → Reportes**; categoría → categories/[id] (I8) → /categories → categories/new
8. **Últimos movimientos**: fila → movements/[id]; "Ver todos" → /movements
9. **Botón + → Nuevo movimiento** (movements/new)
10. **Estados vacíos de Inicio**: sin cuentas (checklist), sin plan ("Crear plan" → plan/setup), sin cuentas en la moneda elegida

Quedan aparte los flujos de auth: verify-email, forgot-password, reset-password.

## 4.1 Perfil › Vinculaciones (/profile/vinculaciones)
- [ ] **V1 — Rediseño en estilo D, mínimo** (canvas: tablero "Perfil › Vinculaciones"). (Mateo: demasiado texto.) Sin bajada, sin rótulos de sección y sin notas: un grupo con las 3 fuentes (nombre + estado por color: verde conectado, gris configurar) y otro con "Importar desde · 1 nov". En local solo aparece Galicia, porque MP y Gmail requieren sus OAuth; el tablero muestra las tres.
- [ ] **V2 — Logos de marca en las 3 fuentes** (Mateo: "es una app privada, no importa"). Mercado Pago, Gmail y Banco Galicia muestran su logo en el círculo. En el canvas son aproximaciones dibujadas a mano; al implementar se usan los archivos oficiales de cada marca, sin modificar. Se reutilizan donde aparezca la fuente (pill de pendientes, Importaciones, detalle de movimiento importado).

## 4.2 Vinculaciones › Mercado Pago (/profile/mercado-pago, `OAuthLinkPage` compartido con Gmail)
- [ ] **M1 — Rediseño mínimo** (canvas: 2 tableros). Logo grande centrado, nombre y una sola línea. Sin vincular: "Pagos, cobros y rendimientos" + botón "Vincular" abajo. Vinculada: "● Conectado" en verde, un grupo "Entra en · cuenta ›" y "Desvincular" como cápsula roja abajo. Se quitan los párrafos (intro, "Tu cuenta está vinculada", la nota sobre la fecha en Vinculaciones). El estado "hay que reconectar" usa la misma pantalla con "● Reconectar" en rojo y botón "Reconectar". La nota de desvincular sigue en el diálogo de confirmación.

## 4.3 Vinculaciones › Gmail (/profile/gmail, /profile/gmail/cards/[card])
- [ ] **G1 — Gmail vinculada, mínima** (canvas). Logo, email, "● Conectado", un grupo con las tarjetas detectadas ("Visa ••4821 · Crédito ›") y "Desvincular" abajo. Se quita el párrafo de "solo leemos alertas…". Sin vincular usa el patrón de MP ("Alertas de compras con tarjeta" + "Vincular"), más una sola línea bajo el botón con el aviso de Google "app no verificada", que es necesario para poder avanzar.
- [ ] **G2 — Detalle de tarjeta, mínimo** (canvas). Título "Visa ••4821", segmentado Crédito/Débito, un grupo con "Pesos · cuenta ›" y "Dólares · Opcional ›", y "Guardar" abajo. Se quitan los dos párrafos sobre crédito y débito y la nota sobre la cuenta en dólares.

## 4.4 Vinculaciones › Banco Galicia (/profile/galicia)
- [ ] **B1 — Rediseño mínimo** (canvas). Logo grande, "Banco Galicia" y una línea "Resumen de Visa o Mastercard". Debajo, un grupo con "Pesos · cuenta ›" y "Dólares · Opcional ›", una zona punteada "Elegir PDF" y el botón "Subir resumen" abajo. Se quitan los 4 textos: intro, nota de dólares, "Elegí primero la cuenta en pesos" (el botón queda deshabilitado sin cuenta) y "Leemos el PDF y lo descartamos…". La privacidad del PDF y la no duplicación podrían quedar en el resultado de la subida.

## 4.5 Perfil › Nombre, Contraseña, Darme de baja
- [ ] **P2 — Nombre**: ya se edita en el lugar (`InlineText` en /profile); no lleva pantalla propia. Solo adopta el estilo de la fila.
- [ ] **P3 — Contraseña, mínima** (canvas). Título "Contraseña" en el header, un grupo con los campos "Actual" y "Nueva" (con el ojo para mostrar), "Mínimo 8 caracteres" debajo y "Guardar" abajo. Se quita "Cancelar" (ya está la flecha de volver). "Cerramos tus otras sesiones" pasa al mensaje de éxito.
- [x] **P4 — Darme de baja** (canvas). Círculo rojo con el tacho, "¿Darte de baja?" y una sola línea: "Se borra absolutamente todo y no se puede deshacer". Debajo, solo el campo de contraseña, y abajo, "Darme de baja" en rojo relleno. Sin lista de lo que se borra (Mateo) y sin "Cancelar".
- [x] ~~P5 — Conteos de Baja~~ → descartado: Baja ya no muestra conteos.

## 5. Avisos (/notifications)
- [x] **AV1 — Lista mínima sin pills** (canvas: "Inicio › Avisos"). Un grupo con una fila por aviso: punto de color de la categoría, nombre y una línea gris con la referencia ("Límite $39.000"). A la derecha va la cifra clave en color (rojo = te pasaste, ámbar = vas rápido) y ›, sin leyenda (Mateo: no hacen falta aclaraciones). Se quita la pill "Te pasaste"/"Vas rápido" (I3) y el mensaje largo. Cada fila lleva a su límite o al plan, como hoy.
- [x] **AV2 — Mensajes con "quedan Y días"**: los avisos "vas rápido" dicen "Gastaste X% … y quedan Y días" (`server/plan/alerts.ts`). Con I5 se quita la parte de los días.
- [x] **AV3 — Estado vacío**: sin avisos, un círculo con check y "Todo en orden" (sin más texto).

## 6 Importaciones (pill "N movimientos pendientes")

Dibujadas desde el código: en demo no hay pendientes ni fuentes vinculadas, así que /imports redirige a Vinculaciones.

- [x] **IM1 — Pendientes** (canvas: "Inicio › Pendientes"). Título "Pendientes", igual que la pill (antes "Importados"). La tarjeta de sincronización se reemplaza por un botón circular ↻ en el header, y los errores de sincronización van en una línea roja. "Tarjeta Visa ••4821: elegí qué es" queda como una fila ámbar "Visa ••4821 · Elegir ›". En "No está en el resumen", Descartar/Dejar son círculos ✕/✓ (sin pills). Las filas del día tienen círculo con inicial (o "?" ámbar), título, categoría sugerida o "¿Qué es?" en ámbar, el monto en color y un círculo ✓ verde para aprobar (o › para revisar). "N aprobados solos ›" es una línea discreta. Abajo, la cápsula "Aprobar N sugeridos".
- [x] **IM2 — Revisar** (canvas, drawer como en la app: `importItem` en `drawers.ts`; Contraseña y Darme de baja también son drawers y se redibujaron como hojas sobre Perfil). El monto grande en color y una línea con la fecha y el texto original. Segmentado Gasto/Ingreso/Transf. Un grupo con Descripción, Categoría (u Origen/Destino) y Pago fijo. "Recordar para X" es un switch, sin texto de ayuda. Descartar pasa a ser un círculo rojo con el tacho en el header, y abajo queda solo "Aprobar".
- [x] **IM3 — Aprobados solos** (canvas). Se renombra "Aprobados automáticamente" y se saca el párrafo "Últimos 30 días…". Las filas muestran inicial, título, categoría · fecha, monto y un círculo ↶ para deshacer.

## Regla global: drawers sin versión pantalla

- [ ] **DR1 — Los drawers no tienen URL propia visible** (Mateo: no quiere URL directa). Aplica a las 15 entradas de `routes/(app)/drawers.ts`. La ruta sigue existiendo solo por dentro, porque de ahí salen los datos del drawer (`preloadData`) y sus form actions (`?/approve`, etc.). El usuario nunca la ve: abrir un drawer ya no cambia la barra de direcciones (`goto('', {shallow})`). Se borra todo lo que hoy la muestra como página: (1) el +page.svelte de pantalla completa, (2) el fallback de `openShallow` a `goto(href)` cuando falla la carga (pasa a mostrar un toast de error), (3) abrir con ctrl/clic medio en pestaña nueva, y (4) entrar tecleando la URL, que redirige a la pantalla padre.

## 7 Cuentas (Saldo total → /accounts)

- [x] **CU1 — Lista** (canvas: "Inicio › Cuentas"). El volver dice "Perfil" aunque entres desde Inicio (`back` fijo a profile). Tiene que volver a donde venías, o a Inicio. "Agregar" pasa a ser un círculo + en el header. Abajo, una búsqueda en cápsula y un círculo de filtros. Los grupos PESOS / DÓLARES llevan el total a la derecha. Cada fila tiene un círculo con el ícono en el color de la cuenta y el saldo sin signo (rojo si es negativo, por eso Efectivo va en rojo).
- [x] **CU2 — Cuenta (drawer)** (canvas). Arriba, el ícono grande, el nombre y el saldo. Un grupo con Nombre, Ícono y color, Saldo inicial y Moneda (solo lectura). Un segundo grupo con "Movimientos ›" y "Archivar". Se saca "Listo": ya guarda en el momento y se cierra deslizando.
- [x] **CU3 — Nueva cuenta (drawer)** (canvas). Círculo de ícono más el nombre en cápsula, segmentado Pesos/Dólares, Saldo inicial en cápsula y "Crear cuenta". Se saca "Cancelar" (se cierra deslizando, igual que en Baja).

## 8 Plan (Pagos fijos → /plan)

- [x] **PL1 — Plan** (canvas: "Inicio › Plan").
  - Sin banda esmeralda. "Plan" como título y la campana a la derecha. "DISPONIBLE" en grande, en color normal (no verde, Mateo), sin el texto "Vas bien". Sin "$X por día · N días" (Mateo: no lo quiere).
  - Tarjetas como las de Inicio (Mateo): Ingresos (verde), Pagos fijos (rojo), Ahorro ↗ y Gastado (rojo) en una grilla de 2, más Dólar $1.332 a lo ancho, solo dato (sin ↗) (antes "Cotización: $1.332 (última compra, 11/11)").
  - Las secciones LÍMITES, INGRESOS FIJOS y PAGOS FIJOS tienen un círculo + en vez de "+ Agregar".
  - Cada límite muestra la barra y el % coloreado (ámbar si va rápido, rojo si se pasó).
  - Los pagos fijos no llevan pills: "Pagado · día 3" en verde, y los pendientes solo "Día 20 · cuenta".
  - INACTIVOS va atenuado, con el motivo como subtítulo.
  - "Eliminar plan" queda como texto rojo al final.
  - Duda: Inicio D ya muestra "DISPONIBLE $539.461". Se repite en Plan; ¿lo dejamos en los dos?
- [x] **PL2 — Pago fijo (drawer)**: ícono, nombre, monto en rojo y estado ("Pagado · día 3"). Un grupo con Descripción, Cuenta, Categoría y Día, y otro con Desactivar y Eliminar en rojo. Sin "Listo".
- [x] **PL3 — Límite (drawer)**: gastado en grande ("55.800 de 39.000") con la barra coloreada. Un grupo con Límite y Categoría, y Eliminar en rojo. Sin "Listo" y sin pill "Te pasaste" (lo dice el color).
- [x] **PL4 — Ahorro (drawer)**: segmentado Monto / % del ingreso, el monto grande en cápsula y "Guardar".
- Nuevo pago fijo y Nuevo límite siguen el patrón de Nueva cuenta: campos en cápsula y un solo botón. No se dibujaron.
- [ ] **PL5 — Se elimina la cotización manual** (Mateo: "solo la automática desde el último movimiento"). El plan usa siempre la cotización de la última compra de dólares (`latestTransferRate`). Se borra la ruta `plan/rate` (RateScreen, RateForm, sus actions set/auto), la entrada `rate` de `drawers.ts` y `form-routes.ts`, y la rama `manual` de `plan/queries.ts:66`. La columna `spending_plans.exchange_rate` deja de leerse en este release y se elimina con una migración en un release posterior (expand/contract). El borrado de la columna es migración, así que va al humano.

## 9 Reportes (tab → /reports)

- [ ] **RE1 — Reportes** (canvas: "Inicio › Reportes").
  - Header como Plan: "Reportes" y campana.
  - ARS/USD pasa a texto subrayado, sin caja. A la derecha, el mes en cápsula con flechas circulares ("Noviembre").
  - Tarjetas como en Inicio: Resultado a lo ancho y en grande (verde si es positivo, rojo si es negativo), más Ingresos (verde) y Gastos (rojo).
  - "Últimos 6 meses": barras redondeadas de ingresos y gastos. El mes actual va pleno y los anteriores atenuados, sin eje ni leyenda (lo dice el color).
  - "Por categoría": una barra apilada redonda y la lista con punto de color, % y monto. Cada fila abre la categoría.
  - Por día y Gasto más grande van como tarjetas ("Alquiler · 3 nov" debajo).
- [x] **RE2 — Fuera "por día" y "gasto más grande" en toda la app** (Mateo: "no me interesa, en ningún lado"). Reportes termina en "Por categoría". También se saca del Plan (PL1) y de cualquier otro lugar donde aparezca un promedio o ritmo diario, o el gasto más grande.

## 10 Categorías (Perfil → /categories)

- [ ] **CA1 — Lista** (canvas: "Reportes › Categorías"). Mismo patrón que Cuentas: círculos de volver y +, búsqueda en cápsula y filtros. El volver dice "Perfil" fijo, igual que Cuentas (CU1): tiene que volver a donde venías. Grupos GASTOS / INGRESOS / AMBOS, con el monto del mes sin signo (rojo si es gasto, verde si es ingreso, gris si es $0).
- [ ] **CA2 — Categoría (drawer)** (canvas). Arriba, el ícono, el nombre, el neto del mes en grande y el selector de mes. Un grupo con Nombre, Ícono y color y Tipo, y otro con "Movimientos ›" y "Archivar".
  - Se saca la pill "Activa/Archivada": si está archivada, se ve atenuada y el botón dice "Desarchivar".
  - "Eliminar" va en rojo debajo de Archivar, con las mismas condiciones que hoy.
  - Sin "Listo".

## Regla global: categorías

- [ ] **CT1 — Una sola forma de mostrar una categoría** (Mateo: "las categorías se muestran inconsistentes, unificá"). Siempre se ve el ícono y el color propios de la categoría, nunca un punto suelto, una inicial ni un ícono genérico:
  - **Fila** (lista de categorías, gastos por categoría en Inicio y Reportes, límites en Plan y Avisos, pagos e ingresos fijos, movimientos en Inicio, Pendientes y Aprobados solos): círculo de 36 px con el ícono en el color de la categoría y el fondo de ese color al 20 %. En los movimientos, la categoría reemplaza a la inicial o al punto del comercio. Si un movimiento no tiene categoría, va un "?" en ámbar.
  - **Valor de un campo** ("Categoría ›" en los drawers de Revisar, Pago fijo, Límite y Movimiento): círculo chico de 20 px con el ícono, más el nombre.
  - **Encabezado de drawer**: el mismo círculo a 56 px.
  - **Gráficos**: la barra apilada usa el color de cada categoría.
  - En la app esto sale de un solo componente (p. ej. `CategoryGlyph` con tamaños sm, md y lg) que lee el ícono y el color de la categoría. Ninguna pantalla arma el suyo.

## 11 Movimientos (tab → /movements)

- [ ] **MO1 — Lista** (canvas: "Inicio › Movimientos").
  - Header como Reportes: "Movimientos" y campana. Fuera el avatar y el contador suelto.
  - Búsqueda en cápsula y círculo de filtros.
  - Cada día es un rótulo ("LUNES 23") con el neto del día a la derecha, siempre (Mateo): rojo si gastaste más de lo que entró, verde si al revés, y gris en 0 (un día solo con transferencias). Cada moneda va por separado ("2.900 · US$10"). Reemplaza "Gastos del día: $4.800", que solo sumaba gastos.
  - Filas según CT1: ícono de la categoría, la descripción, debajo "Categoría · Cuenta" y el monto sin signo (rojo o verde).
  - Transferencias: círculo gris con flechas, "Origen → Destino" y el monto en color normal. La compra de dólares muestra US$ arriba y los pesos debajo.
  - Se saca "Noviembre 2026" como encabezado: los días ya ubican.
- [ ] **MO2 — Movimiento (drawer)** (canvas). Arriba, el ícono de la categoría en grande, la descripción y el monto en rojo o verde. Un grupo con Descripción, Categoría (ícono chico), Cuenta, Fecha y Pago fijo; Eliminar en rojo aparte.
  - Se saca "Tipo": lo dicen el color y la categoría.
  - Sin "Listo".
- [ ] **MO3 — Nuevo movimiento (drawer)** (canvas). Segmentado Gasto/Ingreso/Transf., el monto grande en cápsula en el color del tipo y Descripción en cápsula. Debajo, un grupo con Categoría (ícono chico más nombre, primera fila, arriba de Cuenta, Mateo), Cuenta, Fecha y Repetir todos los meses. Se saca "Cancelar": se cierra deslizando.
- [ ] **MO4 — Elegir categoría (drawer)** (canvas: "Nuevo movimiento › Categoría"). Se abre al tocar la fila Categoría. Es un drawer alto con búsqueda y las categorías válidas para el tipo, agrupadas (con Gasto: GASTOS y AMBOS) y cada una con su ícono. La elegida lleva check, y al final está "Nueva categoría". Al tocar una, se cierra y queda elegida.
## 12 Inicio vacío

- [ ] **IV1** Sin guía ni checklist (el onboarding se hace más adelante). Sin cuentas: Inicio muestra el header y, centrado, un ícono con "Todavía no hay información". Se elimina FirstRunChecklist.
- [ ] **IV2** Con cuenta pero sin plan: DISPONIBLE dice "Sin plan este mes" en muted, sin botón Crear plan. Los tiles y los movimientos muestran lo que haya.
- [ ] **IV3** Secciones sin datos (gastos, movimientos) se ocultan; no hay textos "No hay gastos." ni "Todavía no hay movimientos en …".

## 13 Auth: recuperar y verificar

- [ ] **AU1** Todas las pantallas comparten un layout: botón volver circular, ícono de 56px en un círculo, título, una línea de texto, el campo o los campos en cápsula, el botón principal en cápsula y, si hace falta, uno secundario con borde. Todo va centrado en vertical.
- [ ] **AU2** Recuperar contraseña: "Te mandamos un enlace por email." y el botón Enviar enlace.
- [ ] **AU3** Revisá tu email: el texto incluye el email en negrita y avisa que el enlace vence en 1 hora. El botón principal es Ir a Ingresar. Reenviar es secundario, muestra la cuenta regresiva del cooldown y es el mismo componente que se usa al verificar el email del registro.
- [ ] **AU4** Nueva contraseña: un solo campo con el botón para mostrar u ocultar, la ayuda "Mínimo 8 caracteres" y Guardar contraseña.
- [ ] **AU5** Enlace vencido: una sola pantalla para el reset y para la verificación. El botón principal es Pedir otro y el secundario, Ir a Ingresar.
