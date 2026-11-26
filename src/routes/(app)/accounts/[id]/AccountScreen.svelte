<script lang="ts">
	import { resolve } from '$app/paths';
	import FormScreen from '#lib/components/forms/FormScreen.svelte';
	import { patchShallow } from '#lib/open-shallow.ts';
	import AccountDetail from './AccountDetail.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form, onclose }: { data: PageData; form?: ActionData; onclose?: () => void } =
		$props();

	// A reload (archive, Deshacer, the drawer's refresh) brings the stored account back in; a save sets it at once.
	let detail = $derived({ account: data.account, balance: data.balance });
</script>

<FormScreen
	title={detail.account.name}
	back={{ href: resolve('accounts'), label: 'Volver a cuentas', text: 'Cuentas' }}
	{onclose}
>
	<AccountDetail
		{detail}
		actions={data.actions}
		formError={form?.formError}
		onsaved={(next) => {
			detail = next;
			patchShallow('account', next);
		}}
	/>
</FormScreen>
