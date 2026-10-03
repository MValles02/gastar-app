<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Button from './Button.svelte';
	import Sheet from './Sheet.svelte';

	let {
		name,
		value = $bindable(),
		now,
		error,
		mode = 'datetime',
		label = 'Fecha y hora'
	}: {
		name: string;
		value: string;
		now: string;
		error?: string;
		mode?: 'datetime' | 'date';
		label?: string;
	} = $props();

	const VALID = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
	const DAY = 86_400_000;
	const ymdOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
	const msOf = (ymd: string) => Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10));
	const addDays = (ymd: string, n: number) => ymdOf(msOf(ymd) + n * DAY);
	const fmt = (o: Intl.DateTimeFormatOptions) =>
		new Intl.DateTimeFormat('es-AR', { ...o, timeZone: 'UTC' });
	const chipFmt = fmt({ weekday: 'short', day: 'numeric', month: 'short' });
	const fullFmt = fmt({ dateStyle: 'full' });
	const monthFmt = fmt({ month: 'long', year: 'numeric' });
	const weekdayFmt = fmt({ weekday: 'short' });
	const weekdays = Array.from({ length: 7 }, (_, i) =>
		weekdayFmt.format(msOf('2024-01-01') + i * DAY)
	);
	const pad = (n: number) => String(n).padStart(2, '0');
	const norm = (s: string, max: number) => pad(Math.min(max, parseInt(s || '0', 10)));

	let mounted = $state(false);
	let open = $state(false);
	let hour = $state('');
	let minute = $state('');
	let viewMonth = $state(''); // 'YYYY-MM'
	let focusYmd = $state('');
	let chip: HTMLButtonElement | null = $state(null);
	let grid: HTMLElement | null = $state(null);
	let hiddenInput: HTMLInputElement | null = $state(null);
	const dateOnly = $derived(mode === 'date');
	const id = $props.id();

	const today = $derived(now.slice(0, 10));
	const yesterday = $derived(addDays(today, -1));
	const date = $derived(value.slice(0, 10));
	const isYmd = $derived(/^\d{4}-\d{2}-\d{2}$/.test(date));
	const other = $derived(date !== today && date !== yesterday);

	onMount(() => {
		// Rule: an invalid value falls back to now only when there is no server error;
		// with an error the user's value stays visible so the message makes sense.
		if (dateOnly) {
			mounted = true;
			return;
		}
		if (!VALID.test(value) && !error) value = now;
		const ok = VALID.test(value);
		hour = ok ? value.slice(11, 13) : '';
		minute = ok ? value.slice(14, 16) : '';
		mounted = true;
	});

	function sync() {
		value = `${date}T${norm(hour, 23)}:${norm(minute, 59)}`;
	}

	function setDate(ymd: string) {
		if (dateOnly) {
			value = ymd;
			return;
		}
		value = `${ymd}T${norm(hour, 23)}:${norm(minute, 59)}`;
	}

	function setTime(kind: 'h' | 'm', raw: string) {
		const digits = raw.replace(/\D/g, '');
		if (kind === 'h') hour = digits;
		else minute = digits;
		sync();
	}

	function blurTime() {
		hour = norm(hour, 23);
		minute = norm(minute, 59);
		sync();
	}

	async function openCalendar() {
		focusYmd = isYmd ? date : today;
		viewMonth = focusYmd.slice(0, 7);
		open = true;
		await tick();
		grid?.querySelector<HTMLButtonElement>(`[data-ymd="${focusYmd}"]`)?.focus();
	}

	function showMonth(delta: number) {
		const [y, m] = viewMonth.split('-').map(Number);
		const first = ymdOf(Date.UTC(y, m - 1 + delta, 1));
		const last = new Date(Date.UTC(y, m + delta, 0)).getUTCDate();
		viewMonth = first.slice(0, 7);
		focusYmd = `${viewMonth}-${pad(Math.min(+focusYmd.slice(8, 10), last))}`;
	}

	async function pick(ymd: string) {
		setDate(ymd);
		open = false;
		await tick();
		chip?.focus();
		if (dateOnly) hiddenInput?.dispatchEvent(new Event('change', { bubbles: true }));
	}

	async function clear() {
		value = '';
		await tick();
		chip?.focus();
		hiddenInput?.dispatchEvent(new Event('change', { bubbles: true }));
	}

	async function onDayKey(e: KeyboardEvent) {
		const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
		if (!step) return;
		e.preventDefault();
		focusYmd = addDays(focusYmd, step);
		viewMonth = focusYmd.slice(0, 7);
		await tick();
		grid?.querySelector<HTMLButtonElement>(`[data-ymd="${focusYmd}"]`)?.focus();
	}

	const days = $derived.by(() => {
		if (!viewMonth) return [];
		const [y, m] = viewMonth.split('-').map(Number);
		const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
		return Array.from({ length: count }, (_, i) => `${viewMonth}-${pad(i + 1)}`);
	});
	const lead = $derived(viewMonth ? (new Date(msOf(`${viewMonth}-01`)).getUTCDay() + 6) % 7 : 0);
	const monthTitle = $derived(
		viewMonth ? monthFmt.format(msOf(`${viewMonth}-01`)).replace(/^./, (c) => c.toUpperCase()) : ''
	);
</script>

{#if !mounted}
	<div class="field">
		<label>
			{label}
			<input
				type="text"
				{name}
				bind:value
				aria-describedby="{id}-hint{error ? ` ${id}-error` : ''}"
			/>
		</label>
		<p class="hint" id="{id}-hint">
			{dateOnly ? 'Formato: AAAA-MM-DD' : 'Formato: AAAA-MM-DDTHH:mm'}
		</p>
		{#if error}<p class="error" id="{id}-error" role="alert">{error}</p>{/if}
	</div>
{:else}
	<fieldset aria-describedby={error ? `${id}-error` : undefined}>
		<legend>{label}</legend>
		<input type="hidden" {name} {value} bind:this={hiddenInput} />
		{#if dateOnly}
			<div class="chips">
				<button
					type="button"
					class="chip"
					aria-pressed={isYmd}
					aria-haspopup="dialog"
					bind:this={chip}
					onclick={openCalendar}
				>
					{isYmd ? chipFmt.format(msOf(date)) : 'Elegir fecha'}
				</button>
				{#if isYmd}
					<Button type="button" variant="secondary" onclick={clear}>Quitar</Button>
				{/if}
			</div>
		{:else}
			<div class="chips">
				<button
					type="button"
					class="chip"
					aria-pressed={date === today}
					onclick={() => setDate(today)}
				>
					Hoy
				</button>
				<button
					type="button"
					class="chip"
					aria-pressed={date === yesterday}
					onclick={() => setDate(yesterday)}
				>
					Ayer
				</button>
				<button
					type="button"
					class="chip"
					aria-pressed={other}
					aria-haspopup="dialog"
					bind:this={chip}
					onclick={openCalendar}
				>
					{other && isYmd ? chipFmt.format(msOf(date)) : 'Otra fecha'}
				</button>
			</div>
			<div class="time" role="group" aria-label="Hora del movimiento">
				<label>
					Hora
					<input
						type="text"
						inputmode="numeric"
						maxlength="2"
						value={hour}
						oninput={(e) => setTime('h', e.currentTarget.value)}
						onblur={blurTime}
					/>
				</label>
				<span class="colon" aria-hidden="true">:</span>
				<label>
					Minutos
					<input
						type="text"
						inputmode="numeric"
						maxlength="2"
						value={minute}
						oninput={(e) => setTime('m', e.currentTarget.value)}
						onblur={blurTime}
					/>
				</label>
			</div>
		{/if}
		{#if error}<p class="error" id="{id}-error" role="alert">{error}</p>{/if}
	</fieldset>

	<Sheet title="Elegí la fecha" bind:open>
		<div class="nav">
			<p class="month" aria-live="polite">{monthTitle}</p>
			<Button type="button" variant="secondary" onclick={() => showMonth(-1)}>Mes anterior</Button>
			<Button type="button" variant="secondary" onclick={() => showMonth(1)}>Mes siguiente</Button>
		</div>
		<div class="grid" bind:this={grid}>
			{#each weekdays as weekday (weekday)}
				<span class="weekday" aria-hidden="true">{weekday}</span>
			{/each}
			{#each Array.from({ length: lead }, (_, i) => i) as i (i)}
				<span></span>
			{/each}
			{#each days as ymd (ymd)}
				<button
					type="button"
					class="day"
					data-ymd={ymd}
					tabindex={ymd === focusYmd ? 0 : -1}
					aria-label={fullFmt.format(msOf(ymd))}
					aria-pressed={ymd === date}
					aria-current={ymd === today ? 'date' : undefined}
					onclick={() => pick(ymd)}
					onkeydown={onDayKey}
				>
					{+ymd.slice(8, 10)}
				</button>
			{/each}
		</div>
	</Sheet>
{/if}

<style>
	fieldset {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		border: 0;
		padding: 0;
		min-width: 0;
	}

	legend {
		padding: 0;
		margin-bottom: var(--space-2);
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.hint {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.chip {
		min-height: 2.75rem;
		background: transparent;
		color: var(--text);
		border-color: var(--border-strong);
	}

	.chip:hover {
		opacity: 1;
		background: color-mix(in srgb, var(--primary) 8%, transparent);
	}

	.chip[aria-pressed='true'],
	.day[aria-pressed='true'] {
		background: var(--primary);
		color: var(--on-primary);
		border-color: var(--primary);
	}

	.time {
		display: flex;
		align-items: flex-end;
		gap: var(--space-2);
	}

	.time label {
		width: 5rem;
	}

	.time input {
		text-align: center;
	}

	.colon {
		padding-bottom: var(--space-3);
	}

	.nav {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}

	.month {
		width: 100%;
		font-weight: 500;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: var(--space-1);
	}

	.weekday {
		text-align: center;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.day {
		min-height: 2.75rem;
		padding: 0;
		background: transparent;
		color: var(--text);
		border-color: transparent;
	}

	.day:hover {
		opacity: 1;
		background: color-mix(in srgb, var(--primary) 8%, transparent);
	}

	.day[aria-current='date'] {
		border-color: var(--primary);
	}

	.day[aria-pressed='true']:hover {
		background: var(--primary);
	}
</style>
