var path = require('path');
var webpack = require('webpack');
var CompressionPlugin = require('compression-webpack-plugin');
var HtmlWebpackPlugin= require('html-webpack-plugin');

module.exports = {
    context: path.join(__dirname, "client", "src"),

    entry: {
        'client': "./app.tsx"
    },
    output: {
        path: path.join(__dirname, "dist"),
        filename: '[name].js',
        publicPath: '/'
    },



    devtool: 'source-map',

    resolve: {
        extensions: ['.scss', '.ts', '.tsx', '.js', '.jsx']
    },
    module : {

        rules : [
            {
                test: /\.(tsx|ts)?$/,
                use: ['awesome-typescript-loader']
            },
            {
                test: /\.scss$/,
                use: [
                   {
                       loader: "style-loader"
                   },
                   {
                       loader: "css-loader",
                       options: {
                           sourceMap: false
                       }
                   }
                   , {
                       loader: "sass-loader",
                       options: {
                           sourceMap: false
                       }
                   }
                ]

            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: "style-loader"
                    },
                    {
                        loader: "css-loader",
                        options: {
                            sourceMap: false
                        }
                    }
                ]
            },
            {
                test: /\.woff($|\?)|\.woff2($|\?)|\.ttf($|\?)|\.eot($|\?)/,
                use: {
                    loader: "url-loader",
                    options: {
                        limit: 8192
                    }
                }
            },

            {
                test: /\.svg$/,
                include: [
                    path.resolve(__dirname, 'node_modules/quill/assets/icons')
                ],
                use: [{
                    loader: 'html-loader',
                    options: {
                        minimize: true
                    }
                }]
            },

            {
                test: /\.(jpe?g|png|gif)$/,
                use: [
                    'url-loader'
                    //'image-webpack-loader'
                ]
            },
            {
                test: /\.js\.map$/,
                use: {
                    loader: 'file-loader'
                }
            },
            {
                test: /\.(js|jsx)$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options:{
                        cacheDirectory: true,
                        presets:['react', 'es2015']
                    }
                }
            }
        ]
    },

    plugins: [
        new webpack.DefinePlugin({
                                     'process.env.NODE_ENV': JSON.stringify('development')
                                 }),

        new webpack.optimize.ModuleConcatenationPlugin(),
        new HtmlWebpackPlugin({
                                  template: path.join(__dirname, 'client', 'index.html')
                              }),
        new webpack.optimize.UglifyJsPlugin({
                                                beautify: false,
                                                mangle: {
                                                    screw_ie8: true,
                                                    keep_fnames: true
                                                },
                                                compress: {
                                                    warnings: false,
                                                    screw_ie8: true,
                                                    conditionals: true,
                                                    unused: true,
                                                    comparisons: true,
                                                    sequences: true,
                                                    dead_code: true,
                                                    evaluate: true,
                                                    if_return: true,
                                                    join_vars: true
                                                },
                                                comments: false,
                                                sourceMap: false
                                            }),
        new CompressionPlugin({
                                  asset: "[path].gz[query]",
                                  algorithm: "gzip",
                                  test: /\.(js|html|css|woff|woff2)$/,
                                  threshold: 10240,
                                  minRatio: 0.8
                              })
        ]
};