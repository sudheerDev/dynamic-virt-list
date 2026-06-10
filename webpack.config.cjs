const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const rootDir = __dirname;

module.exports = {
    mode: process.env.NODE_ENV || 'development',
    context: rootDir,
    entry: './src/main.tsx',
    output: {
        clean: true,
        filename: 'virt-lab.[contenthash].js',
        path: path.resolve(rootDir, 'dist'),
        publicPath: '/',
    },
    devtool: 'eval-source-map',
    devServer: {
        historyApiFallback: true,
        hot: false,
        host: '127.0.0.1',
        port: 4127,
        static: {
            directory: path.resolve(rootDir, 'public'),
        },
    },
    module: {
        rules: [
            {
                test: /\.[jt]sx?$/,
                include: path.resolve(rootDir, 'src'),
                use: {
                    loader: 'babel-loader',
                    options: {
                        cacheDirectory: true,
                        presets: [
                            [require.resolve('@babel/preset-env'), {targets: 'defaults'}],
                            [require.resolve('@babel/preset-react'), {runtime: 'automatic'}],
                            require.resolve('@babel/preset-typescript'),
                        ],
                    },
                },
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader',
                ],
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js'],
        modules: [
            path.resolve(rootDir, 'src'),
            'node_modules',
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            title: 'Mattermost Virt Lab',
        }),
    ],
};
