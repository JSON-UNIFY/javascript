NPM = npm
all: .always
	$(NPM) run lint
	$(NPM) run test
node_modules: package.json package-lock.json
	$(NPM) ci
.always:
