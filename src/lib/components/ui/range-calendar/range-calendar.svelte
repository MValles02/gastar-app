<script lang="ts">
	import { RangeCalendar as RangeCalendarPrimitive } from 'bits-ui';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import * as Select from '#lib/components/ui/select/index.js';
	import { LOCALE } from '#lib/locale.ts';
	import { cn, type WithoutChildrenOrChild } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		value = $bindable(),
		placeholder = $bindable(),
		class: className,
		weekdayFormat = 'short',
		weekStartsOn = 1,
		locale = LOCALE,
		...restProps
	}: WithoutChildrenOrChild<RangeCalendarPrimitive.RootProps> = $props();

	const nav =
		'inline-flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 outline-none data-[disabled]:opacity-40';
</script>

<RangeCalendarPrimitive.Root
	bind:ref
	bind:value
	bind:placeholder
	{weekdayFormat}
	{weekStartsOn}
	{locale}
	calendarLabel="Calendario"
	class={cn('w-full', className)}
	{...restProps}
>
	{#snippet children({ months, weekdays })}
		<RangeCalendarPrimitive.Header class="flex items-center justify-between gap-1">
			<RangeCalendarPrimitive.PrevButton>
				{#snippet child({ props })}
					<button {...props} data-slot="calendar-nav" class={nav} aria-label="Mes anterior">
						<ChevronLeftIcon class="size-4" aria-hidden="true" />
					</button>
				{/snippet}
			</RangeCalendarPrimitive.PrevButton>
			<div class="flex min-w-0 items-center gap-2">
				<RangeCalendarPrimitive.MonthSelect aria-label="Mes">
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
				</RangeCalendarPrimitive.MonthSelect>
				<RangeCalendarPrimitive.YearSelect aria-label="Año">
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
				</RangeCalendarPrimitive.YearSelect>
			</div>
			<RangeCalendarPrimitive.NextButton>
				{#snippet child({ props })}
					<button {...props} data-slot="calendar-nav" class={nav} aria-label="Mes siguiente">
						<ChevronRightIcon class="size-4" aria-hidden="true" />
					</button>
				{/snippet}
			</RangeCalendarPrimitive.NextButton>
		</RangeCalendarPrimitive.Header>
		{#each months as month (month.value)}
			<RangeCalendarPrimitive.Grid class="mt-2 w-full border-collapse">
				<RangeCalendarPrimitive.GridHead>
					<RangeCalendarPrimitive.GridRow class="flex">
						{#each weekdays as day (day)}
							<RangeCalendarPrimitive.HeadCell
								class="flex-1 text-center text-xs font-normal text-muted-foreground"
							>
								{day}
							</RangeCalendarPrimitive.HeadCell>
						{/each}
					</RangeCalendarPrimitive.GridRow>
				</RangeCalendarPrimitive.GridHead>
				<RangeCalendarPrimitive.GridBody>
					{#each month.weeks as weekDates (weekDates)}
						<RangeCalendarPrimitive.GridRow class="flex w-full">
							{#each weekDates as date (date)}
								<RangeCalendarPrimitive.Cell
									{date}
									month={month.value}
									class="flex-1 p-0 text-center"
								>
									<RangeCalendarPrimitive.Day
										class="inline-flex h-11 w-full items-center justify-center rounded-lg text-sm tabular-nums outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 data-[outside-month]:text-muted-foreground/50 data-[today]:font-semibold data-[today]:underline data-[selected]:rounded-none data-[selected]:bg-muted data-[selection-start]:rounded-l-lg data-[selection-start]:bg-primary data-[selection-start]:text-primary-foreground data-[selection-end]:rounded-r-lg data-[selection-end]:bg-primary data-[selection-end]:text-primary-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[unavailable]:line-through"
									/>
								</RangeCalendarPrimitive.Cell>
							{/each}
						</RangeCalendarPrimitive.GridRow>
					{/each}
				</RangeCalendarPrimitive.GridBody>
			</RangeCalendarPrimitive.Grid>
		{/each}
	{/snippet}
</RangeCalendarPrimitive.Root>
