const gulp = require('gulp'),
	autoprefixer = require('gulp-autoprefixer'),
	terser = require('gulp-terser'),
	rename = require('gulp-rename'),
	concat = require('gulp-concat'),
	include = require('gulp-include'),
	sourcemaps = require('gulp-sourcemaps'),
	plumber = require('gulp-plumber'),
	gutil = require('gulp-util'),
	insert = require('gulp-insert'),
	del = require('del'),
	fs = require('fs');


const JS_DEST = "dist";

const version_no = "2.1.0",
	version = `/* Quark Engine v${version_no} (c) Green Screens Ltd. */\n`;

const gulp_src = gulp.src;
gulp.src = function() {
	return gulp_src.apply(gulp, arguments)
		.pipe(plumber(function(error) {
			let cause = error.cause;
			let msg = `ERROR : ${cause.message} (line:${cause.line}, col: ${cause.col}, file:${cause.filename})`;
			// Output an error message
			gutil.log(gutil.colors.red(msg));
			// emit the end event, to properly end the task
			this.emit('end');
		}));
};

//build quark for modern browsers
function es6() {
	return gulp.src('src/core_enabled.js')
		.pipe(insert.prepend(version + "\n"))
		//.pipe(sourcemaps.init())
		.pipe(include())
		//.pipe(jshint())
		// .pipe(jshint.reporter('default'))
		.pipe(concat('quark.js'))
		.pipe(gulp.dest(JS_DEST))
		.pipe(rename({
			suffix: '.min'
		}))
		.pipe(terser({
			mangle: false,
			ecma: 2016,
			module: false,
			keep_fnames: true,
			keep_classnames: true
		}))
		.pipe(insert.prepend(version))
		// .pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(JS_DEST))
		.on('end', function() {
			gutil.log('ES6 Quark Engine Complete');
		})
}

function scripts() {
	return Promise.all([es6()]);
}

function clean() {
	return del(['dist']);
}

function watch() {
	// May be not necessary to run a clean and build before the watch.
	gulp.series(clean, gulp.series(scripts));
	// Watch .js files
	gulp.watch('src/**/*.js', scripts);
}

exports.es6 = gulp.series(es6);
exports.scripts = gulp.series(scripts);
exports.clean = gulp.series(clean);
exports.default = gulp.series(clean, gulp.series(scripts));
exports.watch = gulp.series(watch);
