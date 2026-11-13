const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
    entry: "./src/index.jsx",
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'bundle.js',
        publicPath: '/',
        clean: true,
    },
    resolve: {
        extensions: ['.js', '.jsx'],
    },
    devServer: {
        port: 8080,
        hot: true,
        historyApiFallback: true,
        open: true,
        client: {
            webSocketURL: 'ws://localhost:8080/ws',
        }
    },
    module: {
        rules: [
        {
            test: /\.(js|jsx)$/,
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
            },
        },
        {
            test: /\.css$/,
            use: ['style-loader', 'css-loader'],
        }
        ]
    },
    
    plugins: [
        new HtmlWebpackPlugin({
            template: "./public/index.html"
        })
    ]
};
