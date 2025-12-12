const { src, dest } = require('gulp');

function copyAssets() {
	return src('nodes/**/*.{png,svg,json}')
		.pipe(dest('dist/nodes'));
}

exports.default = copyAssets;
exports['build:icons'] = copyAssets;
