var path = require('path');
var nodeexternals = require('webpack-node-externals');

module.exports = {
    target: 'node',
    externals: [nodeexternals()],
    entry: {
        'server': path.join(__dirname, "server", "main.ts")
    },

    node: {
        __dirname: false,
        fs: 'empty'
    },

    output: {
        path: path.resolve(__dirname, 'bin'),
        filename: '[name].js',
        publicPath: '/'
    },

    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },

    module : {

        rules : [
            {
                test: /\.(tsx|ts)?$/,
                use: {
                    loader: 'awesome-typescript-loader',
                    options: {
                        configFileName: path.resolve(__dirname, 'tsconfig.json')
                    }
                }
            },

            {
                test: /\.js\.map$/,
                use: {
                    loader: 'file-loader'
                }
            },
            {
                test: /\.js$/,
                use: {
                    loader: 'source-map-loader'
                }
            },
            {
                test: /\.node$/,
                use: 'node-loader'
            }
        ]
    }
};