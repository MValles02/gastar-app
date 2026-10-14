<script lang="ts">
	import { RangeCalendar as RangeCalendarPrimitive } from 'bits-ui';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
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
		...restProps
	}: WithoutChildrenOrChild<RangeCalendarPrimitive.RootProps> = $props();

	const nav =
		'inline-flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 outline-none data-[disabled]:opacity-40';
	const select =
		'h-11 min-w-0 rounded-lg border border-input bg-background px-2 text-sm capitalize outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
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
				<RangeCalendarPrimitive.MonthSelect class={select} aria-label="Mes" />
				<RangeCalendarPrimitive.YearSelect class={select} aria-label="Año" />
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
