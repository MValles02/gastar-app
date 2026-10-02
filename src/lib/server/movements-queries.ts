import { db } from './db';
import { movements } from './db/schema';
import { movementOwnedBy } from './access';
import type { MovementRow } from './movements';

export function createMovement(userId: string, row: MovementRow) {
	return db
		.insert(movements)
		.values({ ...row, ...movementOwnedBy(userId) })
		.returning({ id: movements.id });
}
