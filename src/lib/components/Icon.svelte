<script lang="ts">
	import type { Component } from 'svelte';
	import type { AccountIconKey, CategoryIconKey } from '#lib/appearance.ts';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import LogOut from '@lucide/svelte/icons/log-out';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import Banknote from '@lucide/svelte/icons/banknote';
	import Bus from '@lucide/svelte/icons/bus';
	import Car from '@lucide/svelte/icons/car';
	import Clapperboard from '@lucide/svelte/icons/clapperboard';
	import Gift from '@lucide/svelte/icons/gift';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import HandCoins from '@lucide/svelte/icons/hand-coins';
	import HeartPulse from '@lucide/svelte/icons/heart-pulse';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import Plane from '@lucide/svelte/icons/plane';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Shirt from '@lucide/svelte/icons/shirt';
	import Utensils from '@lucide/svelte/icons/utensils';
	import Zap from '@lucide/svelte/icons/zap';
	import Bell from '@lucide/svelte/icons/bell';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import Check from '@lucide/svelte/icons/check';
	import Clock from '@lucide/svelte/icons/clock';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CircleDollarSign from '@lucide/svelte/icons/circle-dollar-sign';
	import Coins from '@lucide/svelte/icons/coins';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import House from '@lucide/svelte/icons/house';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Lock from '@lucide/svelte/icons/lock';
	import List from '@lucide/svelte/icons/list';
	import Mail from '@lucide/svelte/icons/mail';
	import PiggyBank from '@lucide/svelte/icons/piggy-bank';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import Tag from '@lucide/svelte/icons/tag';
	import User from '@lucide/svelte/icons/user';
	import Vault from '@lucide/svelte/icons/vault';
	import Wallet from '@lucide/svelte/icons/wallet';

	type IconName =
		| AccountIconKey
		| CategoryIconKey
		| 'search'
		| 'home'
		| 'accounts'
		| 'plus'
		| 'movements'
		| 'categories'
		| 'profile'
		| 'chevron-left'
		| 'chevron-right'
		| 'transfer'
		| 'plan'
		| 'chart'
		| 'bell'
		| 'alert'
		| 'logout'
		| 'check'
		| 'eye'
		| 'eye-off'
		| 'mail'
		| 'clock'
		| 'lock';

	/** Lucide at stroke 1.75; `size` is a CSS length (1rem, 1.25rem or 1.5rem) or a percentage of the parent. */
	let { name, size = '1.5rem' }: { name: IconName; size?: string } = $props();

	const icons: Record<IconName, Component<{ size?: number | string; strokeWidth?: number }>> = {
		home: House,
		accounts: Wallet,
		plus: Plus,
		movements: List,
		categories: Tag,
		profile: User,
		'chevron-left': ChevronLeft,
		'chevron-right': ChevronRight,
		transfer: ArrowLeftRight,
		plan: CalendarCheck,
		chart: ChartColumn,
		bell: Bell,
		alert: CircleAlert,
		logout: LogOut,
		check: Check,
		eye: Eye,
		'eye-off': EyeOff,
		mail: Mail,
		clock: Clock,
		lock: Lock,
		tag: Tag,
		search: Search,
		bank: Landmark,
		wallet: Wallet,
		cash: Banknote,
		card: CreditCard,
		'piggy-bank': PiggyBank,
		dollar: CircleDollarSign,
		coins: Coins,
		safe: Vault,
		briefcase: Briefcase,
		phone: Smartphone,
		cart: ShoppingCart,
		food: Utensils,
		transport: Bus,
		car: Car,
		health: HeartPulse,
		education: GraduationCap,
		entertainment: Clapperboard,
		gift: Gift,
		travel: Plane,
		services: Zap,
		clothing: Shirt,
		pets: PawPrint,
		salary: HandCoins
	};

	const Lucide = $derived(icons[name]);
</script>

<Lucide {size} strokeWidth={1.75} />
