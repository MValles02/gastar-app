const HEX = /(?<![\w&#/])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/i;
const FN = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/;
const IMPORT_PARENTS = new Set([
	'ImportDeclaration',
	'ExportAllDeclaration',
	'ExportNamedDeclaration',
	'ImportExpression'
]);

/** @type {import('eslint').Rule.RuleModule} */
export default {
	meta: {
		type: 'problem',
		schema: [],
		messages: { rawColor: 'Raw colour: use a token from app.css.' }
	},
	create(context) {
		function check(node, value) {
			if (HEX.test(value) || FN.test(value)) context.report({ node, messageId: 'rawColor' });
		}

		return {
			Literal(node) {
				if (typeof node.value !== 'string' || IMPORT_PARENTS.has(node.parent?.type)) return;
				check(node, node.value);
			},
			TemplateElement(node) {
				check(node, node.value.cooked ?? node.value.raw);
			},
			SvelteLiteral(node) {
				check(node, node.value);
			},
			SvelteText(node) {
				if (node.parent.type !== 'SvelteStyleElement') return;
				check(node, node.value.replace(/\/\*[\s\S]*?\*\//g, ''));
			}
		};
	}
};
