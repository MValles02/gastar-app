const DEFAULT_ATTRIBUTES = [
	'placeholder',
	'title',
	'alt',
	'label',
	'aria-label',
	'aria-description',
	'aria-valuetext',
	'aria-roledescription'
];

const hasLetters = (s) => /\p{L}/u.test(s.replace(/&#?\w+;/g, ''));

/** Letters in a string Literal or in the quasis of a TemplateLiteral. */
function expressionHasText(expr) {
	if (expr.type === 'Literal') return typeof expr.value === 'string' && hasLetters(expr.value);
	if (expr.type === 'TemplateLiteral') {
		return expr.quasis.some((q) => hasLetters(q.value.cooked ?? q.value.raw));
	}
	return false;
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
	meta: {
		type: 'problem',
		schema: [
			{
				type: 'object',
				properties: { attributes: { type: 'array', items: { type: 'string' } } },
				additionalProperties: false
			}
		],
		messages: {
			literalText: 'Literal text in markup: use the copy catalogue (src/lib/copy/es.ts).'
		}
	},
	create(context) {
		const attributes = new Set(context.options[0]?.attributes ?? DEFAULT_ATTRIBUTES);
		const report = (node) => context.report({ node, messageId: 'literalText' });

		return {
			SvelteText(node) {
				if (node.parent.type === 'SvelteStyleElement') return;
				if (hasLetters(node.value)) report(node);
			},
			SvelteMustacheTag(node) {
				if (node.parent.type === 'SvelteAttribute') return;
				if (expressionHasText(node.expression)) report(node);
			},
			SvelteAttribute(node) {
				if (!attributes.has(node.key.name)) return;
				for (const part of node.value) {
					const text =
						part.type === 'SvelteLiteral'
							? hasLetters(part.value)
							: expressionHasText(part.expression);
					if (text) report(part);
				}
			}
		};
	}
};
