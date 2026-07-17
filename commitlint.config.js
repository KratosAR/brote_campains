const TAGS = ['INFRA', 'BACKEND', 'FRONTEND']

module.exports = {
  extends: ['@commitlint/config-conventional'],
  parserPreset: {
    parserOpts: {
      // Every commit header must start with an area tag, followed by a normal
      // Conventional Commits type(scope): subject, e.g.:
      //   [BACKEND] fix(api): reorder analytics routes before :campaignId
      //   [INFRA] chore(ci): enable workflow on development branch
      //   [FRONTEND] feat(web): add campaign wizard step 3
      headerPattern: /^\[(INFRA|BACKEND|FRONTEND)\]\s+(\w+)(?:\(([\w$.\-*/ ]*)\))?!?: (.+)$/,
      headerCorrespondence: ['tag', 'type', 'scope', 'subject'],
    },
  },
  plugins: [
    {
      rules: {
        'tag-enum': (parsed) => {
          if (!parsed.tag) {
            return [
              false,
              `commit header must start with an area tag, e.g. "[BACKEND] fix(api): ..." ` +
                `- allowed tags: ${TAGS.map((t) => `[${t}]`).join(', ')}`,
            ]
          }
          return [
            TAGS.includes(parsed.tag),
            `tag must be one of ${TAGS.map((t) => `[${t}]`).join(', ')} - got "[${parsed.tag}]"`,
          ]
        },
      },
    },
  ],
  rules: {
    'tag-enum': [2, 'always'],
    'scope-enum': [
      2,
      'always',
      [
        'domain',
        'application',
        'infrastructure',
        'contracts',
        'common',
        'testing',
        'sdk',
        'api',
        'web',
        'worker',
        'scheduler',
        'webhook',
        'cli',
        'meta',
        'evolution',
        'fake',
        'prisma',
        'docker',
        'ci',
        'deps',
        'config',
      ],
    ],
  },
}
