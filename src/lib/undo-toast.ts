import { toast } from 'svelte-sonner';
import { refreshAll } from '$app/navigation';

/**
 * Success toast with a single "Deshacer" action: runs `undo`, then refreshes the loads (`refreshAll`, which keeps a shallow-route drawer open). A failed undo
 * shows an error toast; a successful one adds none, and a failed refresh after it is ignored.
 */
export function undoToast(message: string, undo: () => Promise<void>) {
	toast.success(message, {
		duration: 5000,
		action: {
			label: 'Deshacer',
			onClick: async () => {
				try {
					await undo();
				} catch {
					toast.error('No se pudo deshacer.');
					return;
				}
				// The undo went through: a failed refresh is not an undo failure; the next navigation reloads.
				await refreshAll().catch((e) => console.error('refreshAll after undo failed', e));
			}
		}
	});
}
