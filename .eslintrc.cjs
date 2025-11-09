/** @type {import('@types/eslint').Linter.BaseConfig} */
module.exports = {
  root: true,
  extends: [
    "@remix-run/eslint-config",
    "@remix-run/eslint-config/node",
    "@remix-run/eslint-config/jest-testing-library",
    "prettier",
  ],
  globals: {
    shopify: "readonly"
  },
  rules: {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["**/*.server"],
            "message": "Do not import server-only modules into client code. Use server-only modules only in loaders/actions or other server-side code.",
            "allowTypeImports": false
          }
        ]
      }
    ]
  },
};
