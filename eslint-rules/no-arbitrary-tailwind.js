const CLASS_HELPERS = new Set(['cn', 'clsx', 'twMerge', 'tv', 'cva']);
const PALETTE =
	/-(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}|black|white)(?:\/\S+)?$/;
const SKIP_KEYS = new Set(['parent', 'loc', 'range', 'tokens', 'comments']);

/** Splits on `sep` outside [] and (). */
function splitTopLevel(token, sep) {
	const parts = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < token.length; i++) {
		const c = token[i];
		if (c === '[' || c === '(') depth++;
		else if (c === ']' || c === ')') depth--;
		else if (c === sep && depth === 0) {
			parts.push(token.slice(start, i));
			start = i + 1;
		}
	}
	parts.push(token.slice(start));
	return parts;
}

/** Calls `fn(node, value)` for every string Literal / TemplateElement under `node`. */
function walkStrings(node, fn) {
	if (!node || typeof node !== 'object') return;
	if (Array.isArray(node)) return node.forEach((n) => walkStrings(n, fn));
	if (node.type === 'Literal' && typeof node.value === 'string') fn(node, node.value);
	else if (node.type === 'TemplateElement') fn(node, node.value.cooked ?? node.value.raw);
	for (const key of Object.keys(node)) {
		if (!SKIP_KEYS.has(key)) walkStrings(node[key], fn);
	}
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
	meta: {
		type: 'problem',
		schema: [],
		messages: {
			arbitrary: 'Arbitrary Tailwind value "{{token}}": use a token from app.css.',
			palette: 'Default-palette colour "{{token}}": use a semantic colour token.'
		}
	},
	create(context) {
		const seen = new WeakSet();

		function check(node, value) {
			if (seen.has(node)) return;
			seen.add(node);
			for (const raw of value.split(/\s+/)) {
				const token = raw.replace(/^!+|!+$/g, '');
				if (!token) continue;
				const utility = splitTopLevel(token, ':')
					.pop()
					.replace(/^!+|!+$/g, '');
				if (utility.includes('['))
					context.report({ node, messageId: 'arbitrary', data: { token } });
				else if (PALETTE.test(utility))
					context.report({ node, messageId: 'palette', data: { token } });
			}
		}

		return {
			SvelteAttribute(node) {
				const name = node.key.name;
				if (name !== 'class' && !/Class$/.test(name)) return;
				for (const part of node.value) {
					if (part.type === 'SvelteLiteral') check(part, part.value);
					else walkStrings(part.expression, check);
				}
			},
			SvelteDirective(node) {
				if (node.kind !== 'Class') return;
				check(node.key.name, node.key.name.name);
			},
			CallExpression(node) {
				if (node.callee.type === 'Identifier' && CLASS_HELPERS.has(node.callee.name)) {
					walkStrings(node.arguments, check);
				}
			}
		};
	}
};
