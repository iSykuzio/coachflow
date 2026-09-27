-- ============================================================================
-- CoachFlow — trim the shared starter library.
-- Additive. Does not edit 0001–0015, change RLS, or touch trainer-owned rows.
--
-- workout_exercises.exercise_id references exercises ON DELETE RESTRICT.
-- A shared row that is already used in a workout is renamed, not deleted.
-- A shared row is deleted only when nothing references it.
-- ============================================================================

update public.exercises e
set name = r.new_name
from (
  values
    ('squat', 'Back Squat'),
    ('overhead press', 'Shoulder Press'),
    ('push-up', 'Push-Up'),
    ('pull-up', 'Pull-Up'),
    ('chin-up', 'Chin-Up'),
    ('neutral-grip pull-up', 'Neutral-Grip Pull-Up'),
    ('cable overhead extension', 'Cable Overhead Triceps Extension'),
    ('treadmill run', 'Treadmill')
) as r(old_name, new_name)
where e.trainer_id is null
  and lower(e.name) = r.old_name
  and not exists (
    select 1
    from public.exercises other
    where other.trainer_id is null
      and lower(other.name) = lower(r.new_name)
      and other.id <> e.id
  );

update public.exercises
set muscle_group = 'Hamstrings'
where trainer_id is null
  and lower(name) = 'deadlift'
  and muscle_group = 'Posterior chain';

insert into public.exercises (name, category, muscle_group, equipment, instructions, is_custom, trainer_id)
select seed.name, seed.category, seed.muscle_group, seed.equipment, seed.instructions, false, null
from (
  values
    ('Assisted Pull-Up', 'Strength', 'Back', 'Machine', 'Use the assisted machine and pull the chest toward the handles.'),
    ('Assisted Dip', 'Strength', 'Triceps', 'Machine', 'Use the assisted machine and lower until the elbows are about 90 degrees.'),
    ('Smith Machine Squat', 'Strength', 'Quads', 'Machine', 'Bar on the upper back. Sit down, then stand.'),
    ('Rope Pushdown', 'Strength', 'Triceps', 'Cable', 'Push the rope down and split the ends at the bottom.')
) as seed(name, category, muscle_group, equipment, instructions)
where not exists (
  select 1
  from public.exercises e
  where e.trainer_id is null
    and lower(e.name) = lower(seed.name)
);

delete from public.exercises e
where e.trainer_id is null
  and lower(e.name) in (
    'incline cable fly',
    'close-grip push-up',
    'meadows row',
    'rack pull',
    'pendlay row',
    'arnold press',
    'front raise',
    'upright row',
    'push press',
    'landmine press',
    'z-press',
    'concentration curl',
    'spider curl',
    'dumbbell kickback',
    'bench dip',
    'jm press',
    'wrist curl',
    'reverse wrist curl',
    'farmers carry',
    'dead hang',
    'suitcase carry',
    'sissy squat',
    'box squat',
    'wall sit',
    'good morning',
    'nordic hamstring curl',
    'sumo deadlift',
    'cable pull-through',
    'cable kickback',
    'frog pump',
    'single-leg hip thrust',
    'donkey calf raise',
    'single-leg calf raise',
    'pallof press',
    'hollow hold',
    'cable woodchop',
    'thruster',
    'clean',
    'power clean',
    'dumbbell snatch',
    'turkish get-up',
    'bear crawl',
    'battle ropes',
    'skierg',
    'worlds greatest stretch',
    'cat-cow',
    '90/90 hip switch',
    'couch stretch',
    'thoracic rotation',
    'downward dog',
    'shoulder cars',
    'hip flexor stretch',
    'hip airplane'
  )
  and not exists (
    select 1
    from public.workout_exercises we
    where we.exercise_id = e.id
  );
