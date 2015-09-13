'use strict';

module.exports = {
    module: {
        loaders: [
            {
                test: /\.js?$/,
                exclude: /node_modules\/(?!(co|babel))/,
                loader: 'babel',
                query: {
                    optional: ['runtime'],
                    stage: 0
                }
            }
        ]
    },
    entry: [ './web.js' ],
    output: {
        // Make sure to use [name] or [id] in output.filename
        //  when using multiple entry points
        filename: 'build/main.js',
        chunkFilename: '[id].bundle.js'
    }
};
