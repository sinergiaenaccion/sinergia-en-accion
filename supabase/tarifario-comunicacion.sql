-- Panel Equipo · Tarifario de comunicación y marketing digital (Sinergia en Acción)
-- Ejecutar en el SQL Editor del proyecto Supabase de Sinergia.
-- Requiere que el panel use Supabase Auth (email + contraseña).

-- 1) Lista de usuarios del equipo autorizados a ver el tarifario.
--    Solo se consulta desde la función de abajo; el navegador no puede leerla.
create table if not exists public.equipo_panel_usuarios (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.equipo_panel_usuarios enable row level security;

-- 2) Tarifario. Solo lectura para usuarios autorizados; los cambios se hacen desde el SQL Editor.
create table if not exists public.tarifario_comunicacion_items (
  id text primary key,
  orden integer not null,
  etapa smallint not null,
  etapa_nombre text not null,
  categoria text not null,
  servicio text not null,
  alcance text not null,
  precio numeric(12,2) not null,
  desde boolean not null default false,
  activo boolean not null default true
);
alter table public.tarifario_comunicacion_items enable row level security;

create or replace function public.es_equipo_sinergia()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.equipo_panel_usuarios u
    where lower(u.email) = lower(auth.jwt() ->> 'email')
  );
$$;
revoke all on function public.es_equipo_sinergia() from public;
grant execute on function public.es_equipo_sinergia() to authenticated;

drop policy if exists "equipo lee tarifario" on public.tarifario_comunicacion_items;
create policy "equipo lee tarifario"
  on public.tarifario_comunicacion_items
  for select
  to authenticated
  using (activo and public.es_equipo_sinergia());

-- 3) Usuarios autorizados. Reemplazar por el mail real que usará el equipo
--    (el mismo que se crea en Authentication > Users con su contraseña).
insert into public.equipo_panel_usuarios (email)
values ('sinergiaenaccion.consultoria@gmail.com')
on conflict (email) do nothing;

-- 4) Carga del tarifario (valores en ARS, base octubre 2026).
insert into public.tarifario_comunicacion_items
  (id, orden, etapa, etapa_nombre, categoria, servicio, alcance, precio, desde)
values
  ('plan-esencial', 1, 6, 'Gestión mensual', 'Gestión mensual', 'Plan Esencial', '8 piezas mensuales; Instagram y Facebook; diseño con plantillas, copy, calendario y programación.', 180000, false),
  ('plan-crecimiento', 2, 6, 'Gestión mensual', 'Gestión mensual', 'Plan Crecimiento', '12 piezas mensuales; Instagram y Facebook; diseños personalizados, copy, calendario, programación y revisión básica de resultados.', 260000, false),
  ('plan-integral', 3, 6, 'Gestión mensual', 'Gestión mensual', 'Plan Integral', '16 piezas mensuales; Instagram y Facebook; variedad de formatos, carruseles, historias de apoyo, planificación e informe mensual.', 360000, false),
  ('diseno-de-placa-estatica', 4, 4, 'Solicitudes individuales', 'Contenido individual', 'Diseño de placa estática', 'Una pieza gráfica estática.', 15000, false),
  ('carrusel-de-hasta-7-diapositivas', 5, 4, 'Solicitudes individuales', 'Contenido individual', 'Carrusel de hasta 7 diapositivas', 'Diseño de carrusel; incluye estructura visual básica.', 28000, false),
  ('pack-de-5-historias', 6, 5, 'Packs', 'Contenido individual', 'Pack de 5 historias', 'Cinco historias diseñadas.', 25000, false),
  ('reel-con-edicion-sencilla', 7, 4, 'Solicitudes individuales', 'Contenido individual', 'Reel con edición sencilla', 'Con material provisto por el cliente.', 35000, false),
  ('reel-con-edicion-trabajada', 8, 4, 'Solicitudes individuales', 'Contenido individual', 'Reel con edición trabajada', 'Guion, subtítulos y edición más elaborada; material provisto.', 50000, false),
  ('copy-para-publicacion', 9, 4, 'Solicitudes individuales', 'Contenido individual', 'Copy para publicación', 'Redacción de texto y llamado a la acción.', 7000, false),
  ('programacion-de-hasta-10-publicaciones', 10, 4, 'Solicitudes individuales', 'Contenido individual', 'Programación de hasta 10 publicaciones', 'El cliente entrega piezas y textos finales listos para programar.', 45000, false),
  ('adaptacion-a-otro-formato-o-canal', 11, 4, 'Solicitudes individuales', 'Contenido individual', 'Adaptación a otro formato o canal', 'Adaptación de una pieza existente.', 5000, false),
  ('pack-de-10-piezas-graficas', 12, 5, 'Packs', 'Contenido individual', 'Pack de 10 piezas gráficas', 'Diseño sin gestión de redes; según brief acordado.', 130000, false),
  ('auditoria-de-redes-sociales', 13, 1, 'Diagnóstico inicial', 'Estrategia y consultoría', 'Auditoría de redes sociales', 'Diagnóstico de perfiles, contenido y oportunidades de mejora.', 60000, false),
  ('optimizacion-de-perfiles-y-biografias', 14, 2, 'Estrategia y configuración', 'Estrategia y consultoría', 'Optimización de perfiles y biografías', 'Por marca; incluye presentación y textos básicos del perfil.', 45000, false),
  ('calendario-mensual-de-contenidos', 15, 2, 'Estrategia y configuración', 'Estrategia y consultoría', 'Calendario mensual de contenidos', 'Plan editorial mensual, temas, formatos y fechas.', 55000, false),
  ('plan-estrategico-trimestral', 16, 2, 'Estrategia y configuración', 'Estrategia y consultoría', 'Plan estratégico trimestral', 'Objetivos, públicos, pilares, canales, acciones y métricas.', 180000, false),
  ('consultoria-individual-de-60-minutos', 17, 2, 'Estrategia y configuración', 'Estrategia y consultoría', 'Consultoría individual de 60 minutos', 'Sesión de asesoramiento puntual.', 35000, false),
  ('informe-mensual-de-metricas', 18, 2, 'Estrategia y configuración', 'Estrategia y consultoría', 'Informe mensual de métricas', 'Servicio adicional si no está incluido en el plan.', 35000, false),
  ('diseno-de-campana-promocional', 19, 4, 'Solicitudes individuales', 'Estrategia y consultoría', 'Diseño de campaña promocional', 'Desde; el precio final depende de alcance y cantidad de piezas.', 65000, true),
  ('banco-de-20-ideas-de-contenido', 20, 2, 'Estrategia y configuración', 'Estrategia y consultoría', 'Banco de 20 ideas de contenido', 'Ideas con enfoque editorial para una marca.', 45000, false),
  ('gestion-y-direccion-de-sesion-fotografica', 21, 4, 'Solicitudes individuales', 'Producción visual', 'Gestión y dirección de sesión fotográfica', 'Honorarios propios por coordinación; fotógrafo, traslado y derechos se cotizan aparte.', 45000, false),
  ('identidad-visual-basica', 22, 3, 'Identidad y base visual', 'Identidad y diseño', 'Identidad visual básica', 'Desde; alcance, aplicaciones y entregables a definir.', 180000, true),
  ('kit-de-marca-para-redes', 23, 3, 'Identidad y base visual', 'Identidad y diseño', 'Kit de marca para redes', 'Portadas, plantillas y recursos gráficos.', 90000, false),
  ('presentacion-institucional-o-comercial', 24, 3, 'Identidad y base visual', 'Identidad y diseño', 'Presentación institucional o comercial', 'Desde; según extensión y complejidad.', 90000, true),
  ('catalogo-digital-de-hasta-15-paginas', 25, 3, 'Identidad y base visual', 'Identidad y diseño', 'Catálogo digital de hasta 15 páginas', 'Desde; el cliente provee textos, precios e imágenes.', 150000, true),
  ('configuracion-basica-de-automatizacion', 26, 7, 'Digital y automatización', 'Digital y automatización', 'Configuración básica de automatización', 'Desde; sujeto a herramientas, integraciones y flujos requeridos.', 120000, true),
  ('pagina-web-institucional-sencilla', 27, 7, 'Digital y automatización', 'Digital y automatización', 'Página web institucional sencilla', 'Desde; no incluye dominio, hosting, licencias ni desarrollos complejos.', 450000, true),
  ('mantenimiento-web-mensual', 28, 7, 'Digital y automatización', 'Digital y automatización', 'Mantenimiento web mensual', 'Desde; alcance y frecuencia de tareas a definir.', 65000, true),
  ('configuracion-inicial-de-calendario-y-programacion', 29, 2, 'Estrategia y configuración', 'Configuración', 'Configuración inicial de calendario y programación', 'Configuración básica de herramientas y flujo de publicación.', 45000, false)
on conflict (id) do update set
  orden = excluded.orden,
  etapa = excluded.etapa,
  etapa_nombre = excluded.etapa_nombre,
  categoria = excluded.categoria,
  servicio = excluded.servicio,
  alcance = excluded.alcance,
  precio = excluded.precio,
  desde = excluded.desde;

-- 5) Historial de presupuestos del equipo (todas las marcas en un mismo historial).
--    Cada presupuesto guarda una copia de sus líneas y precios del momento,
--    para comparar después aunque el tarifario cambie.
create table if not exists public.presupuestos (
  id uuid primary key default gen_random_uuid(),
  creado_at timestamptz not null default now(),
  creado_por text default (auth.jwt() ->> 'email'),
  marca text not null,
  cliente text not null,
  email text,
  telefono text,
  cuentas integer not null default 1 check (cuentas >= 1),
  lista numeric(14,2) not null,
  descuento numeric(14,2) not null default 0,
  total numeric(14,2) not null,
  emitido_at timestamptz not null,
  vence_at timestamptz not null,
  tarifario_version text not null,
  lineas jsonb not null
);
alter table public.presupuestos enable row level security;

drop policy if exists "equipo lee presupuestos" on public.presupuestos;
create policy "equipo lee presupuestos"
  on public.presupuestos for select to authenticated
  using (public.es_equipo_sinergia());

drop policy if exists "equipo guarda presupuestos" on public.presupuestos;
create policy "equipo guarda presupuestos"
  on public.presupuestos for insert to authenticated
  with check (public.es_equipo_sinergia());
