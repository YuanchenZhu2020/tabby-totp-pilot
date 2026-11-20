const path = require('path')

module.exports = {
    entry: './src/index.ts',
    mode: 'production',
    devtool: 'source-map',
    optimization: {
        minimize: false,
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        compilerOptions: {
                            noEmit: false,
                        },
                    },
                },
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js',
        libraryTarget: 'umd',
        globalObject: 'global',
    },
    externals: [
        '@angular/common',
        '@angular/core',
        '@angular/forms',
        '@ng-bootstrap/ng-bootstrap',
        'rxjs',
        'tabby-core',
        'tabby-settings',
        'tabby-ssh',
        'tabby-terminal',
        'crypto',
    ],
}
