-- Panel Equipo · Borradores de presupuesto
-- Ejecutar en el proyecto "sinergia-equipo" (SQL Editor). Es seguro ejecutarlo más de una vez.

-- 1) Estado del presupuesto: "borrador" (guardado, sin PDF emitido) o "emitido" (PDF descargado).
--    Los presupuestos que ya existen quedan como "emitido".
alter table public.presupuestos
  add column if not exists estado text not null default 'emitido';

alter table public.presupuestos
  drop constraint if exists presupuestos_estado_check;
alter table public.presupuestos
  add constraint presupuestos_estado_check check (estado in ('borrador','emitido'));

-- 2) Fecha de la última modificación (útil para los borradores).
alter table public.presupuestos
  add column if not exists actualizado_at timestamptz not null default now();

-- 3) El equipo puede actualizar un presupuesto (para seguir editando un borrador).
drop policy if exists "equipo actualiza presupuestos" on public.presupuestos;
create policy "equipo actualiza presupuestos"
  on public.presupuestos for update to authenticated
  using (public.es_equipo_sinergia())
  with check (public.es_equipo_sinergia());
