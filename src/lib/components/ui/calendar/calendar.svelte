<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
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
	}: WithoutChildrenOrChild<CalendarPrimitive.RootProps> = $props();

	const nav =
		'inline-flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 outline-none data-[disabled]:opacity-40';
	const select =
		'h-11 min-w-0 rounded-lg border border-input bg-background px-2 text-sm capitalize outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
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
			<div class="flex min-w-0 items-center gap-2">
				<CalendarPrimitive.MonthSelect class={select} aria-label="Mes" />
				<CalendarPrimitive.YearSelect class={select} aria-label="Año" />
			</div>
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
										class="inline-flex h-11 w-full items-center justify-center rounded-lg text-sm tabular-nums outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 data-[outside-month]:text-muted-foreground/50 data-[today]:font-semibold data-[today]:underline data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[unavailable]:line-through"
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
