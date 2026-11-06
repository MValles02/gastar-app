<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import * as Select from '$lib/components/ui/select/index.js';
	import { LOCALE } from '$lib/locale';
	import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		value = $bindable(),
		placeholder = $bindable(),
		class: className,
		weekdayFormat = 'short',
		weekStartsOn = 1,
		locale = LOCALE,
		captionLayout = 'dropdown',
		...restProps
	}: WithoutChildrenOrChild<CalendarPrimitive.RootProps> & {
		/** `label`: a plain "Noviembre 2026" heading between the arrows, and no days of other months. */
		captionLayout?: 'dropdown' | 'label';
	} = $props();

	const plain = $derived(captionLayout === 'label');

	function monthName(d: { year: number; month: number }) {
		const m = new Intl.DateTimeFormat(LOCALE, { month: 'long', timeZone: 'UTC' }).format(
			new Date(Date.UTC(d.year, d.month - 1, 1))
		);
		return `${m[0].toUpperCase()}${m.slice(1)} ${d.year}`;
	}

	const nav =
		'inline-flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 outline-none data-[disabled]:opacity-40';
</script>

<CalendarPrimitive.Root
	bind:ref
	bind:value={value as never}
	bind:placeholder
	{weekdayFormat}
	{weekStartsOn}
	{locale}
	calendarLabel="Calendario"
	class={cn('w-full', className)}
	{...restProps}
>
	{#snippet children({ months, weekdays })}
		<CalendarPrimitive.Header class="flex items-center justify-between gap-1">
			<CalendarPrimitive.PrevButton>
				{#snippet child({ props })}
					<button {...props} data-slot="calendar-nav" class={nav} aria-label="Mes anterior">
						<ChevronLeftIcon class="size-4" aria-hidden="true" />
					</button>
				{/snippet}
			</CalendarPrimitive.PrevButton>
			{#if plain}
				<span
					class="text-base font-semibold"
					aria-live="polite"
					data-month={months[0]?.value.toString().slice(0, 7)}
					>{months[0] ? monthName(months[0].value) : ''}</span
				>
			{:else}
				<div class="flex min-w-0 items-center gap-2">
					<CalendarPrimitive.MonthSelect aria-label="Mes">
						{#snippet child({ monthItems, selectedMonthItem })}
							<Select.Root
								type="single"
								value={String(selectedMonthItem.value)}
								onValueChange={(v) => (placeholder = placeholder?.set({ month: Number(v) }))}
								items={monthItems.map((i) => ({ value: String(i.value), label: i.label }))}
							>
								<Select.Trigger aria-label="Mes">{selectedMonthItem.label}</Select.Trigger>
								<Select.Content>
									{#each monthItems as item (item.value)}
										<Select.Item value={String(item.value)} label={item.label} />
									{/each}
								</Select.Content>
							</Select.Root>
						{/snippet}
					</CalendarPrimitive.MonthSelect>
					<CalendarPrimitive.YearSelect aria-label="Año">
						{#snippet child({ yearItems, selectedYearItem })}
							<Select.Root
								type="single"
								value={String(selectedYearItem.value)}
								onValueChange={(v) => (placeholder = placeholder?.set({ year: Number(v) }))}
								items={yearItems.map((i) => ({ value: String(i.value), label: i.label }))}
							>
								<Select.Trigger aria-label="Año">{selectedYearItem.label}</Select.Trigger>
								<Select.Content>
									{#each yearItems as item (item.value)}
										<Select.Item value={String(item.value)} label={item.label} />
									{/each}
								</Select.Content>
							</Select.Root>
						{/snippet}
					</CalendarPrimitive.YearSelect>
				</div>
			{/if}
			<CalendarPrimitive.NextButton>
				{#snippet child({ props })}
					<button {...props} data-slot="calendar-nav" class={nav} aria-label="Mes siguiente">
						<ChevronRightIcon class="size-4" aria-hidden="true" />
					</button>
				{/snippet}
			</CalendarPrimitive.NextButton>
		</CalendarPrimitive.Header>
		{#each months as month (month.value)}
			<CalendarPrimitive.Grid class="mt-2 w-full border-collapse">
				<CalendarPrimitive.GridHead>
					<CalendarPrimitive.GridRow class="flex">
						{#each weekdays as day (day)}
							<CalendarPrimitive.HeadCell
								class="flex-1 text-center text-xs font-normal text-muted-foreground"
							>
								{day}
							</CalendarPrimitive.HeadCell>
						{/each}
					</CalendarPrimitive.GridRow>
				</CalendarPrimitive.GridHead>
				<CalendarPrimitive.GridBody>
					{#each month.weeks as weekDates (weekDates)}
						<CalendarPrimitive.GridRow class="flex w-full">
							{#each weekDates as date (date)}
								<CalendarPrimitive.Cell {date} month={month.value} class="flex-1 p-0 text-center">
									<CalendarPrimitive.Day
										class={cn(
											'inline-flex h-11 w-full items-center justify-center rounded-lg text-sm tabular-nums outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 data-[today]:font-semibold data-[today]:underline data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[unavailable]:line-through',
											plain
												? 'h-10 rounded-full text-base data-[outside-month]:invisible data-[selected]:font-semibold'
												: 'data-[outside-month]:text-muted-foreground/50'
										)}
									/>
								</CalendarPrimitive.Cell>
							{/each}
						</CalendarPrimitive.GridRow>
					{/each}
				</CalendarPrimitive.GridBody>
			</CalendarPrimitive.Grid>
		{/each}
	{/snippet}
</CalendarPrimitive.Root>
