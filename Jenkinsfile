pipeline {
    agent {
        label 'nodejs-agent' // Especifica un agente con Node.js instalado
    }

    options {
        timeout(time: 20, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '5'))
        disableConcurrentBuilds()
    }

    environment {
        // Configuración básica
        APP_NAME = "mi-app-js"
        NODE_VERSION = "18.x" // Versión específica de Node.js
        
        // Configuración del repositorio (usar credenciales de Jenkins)
        REPO_URL = "https://github.com/Raulcudris/devops_Nodes.git"
        
        // Configuración de calidad de código
        ESLINT_RULES = "eslint:recommended"
        UNIT_TEST_SCRIPT = "npm test"
        
        // Notificaciones
        SLACK_CHANNEL = "#dev-notifications"
    }

    stages {
        stage('Preparación') {
            steps {
                script {
                    echo "🚀 Iniciando pipeline para aplicación JavaScript"
                    echo "📦 Aplicación: ${APP_NAME}"
                    echo "🔗 Repositorio: ${REPO_URL}"
                    echo "🔄 Versión Node.js: ${NODE_VERSION}"
                    
                    // Verificar herramientas esenciales
                    sh '''
                        node --version || { echo "❌ Node.js no está instalado"; exit 1; }
                        npm --version || { echo "❌ npm no está instalado"; exit 1; }
                        git --version || { echo "❌ Git no está instalado"; exit 1; }
                    '''
                }
            }
        }

        stage('Checkout Código') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: 'main']],
                    extensions: [
                        [$class: 'CleanBeforeCheckout'],
                        [$class: 'RelativeTargetDirectory', relativeTargetDir: 'src'],
                        [$class: 'CloneOption', depth: 1, noTags: false, shallow: true]
                    ],
                    userRemoteConfigs: [[
                        url: "${env.REPO_URL}",
                        credentialsId: "github-creds" // Credencial configurada en Jenkins
                    ]]
                ])
                
                dir('src') {
                    sh 'git log -1 --pretty=%B > commit_message.txt'
                    sh 'cat commit_message.txt'
                }
            }
        }

        stage('Configurar Entorno') {
            steps {
                script {
                    // Usar versión específica de Node.js
                    nvm(nodeJSInstallationName: 'NodeJS') {
                        sh 'node --version'
                    }
                    
                    // Configurar npm (opcional)
                    sh 'npm config set loglevel warn'
                    sh 'npm config set fund false'
                }
            }
        }

        stage('Instalar Dependencias') {
            steps {
                dir('src') {
                    script {
                        try {
                            // Usar cache de npm si está configurado
                            cache([$class: 'ArbitraryFileCache', path: 'node_modules/']) {
                                sh 'npm ci --prefer-offline'
                            }
                            echo "✅ Dependencias instaladas correctamente"
                        } catch (Exception e) {
                            echo "❌ Error instalando dependencias: ${e.toString()}"
                            echo "Intentando con npm install..."
                            sh 'npm install'
                        }
                    }
                }
            }
        }

        stage('Linting y Análisis de Código') {
            steps {
                dir('src') {
                    script {
                        try {
                            sh 'npm run lint || echo "⚠️ Linting encontró problemas"'
                            // Opcional: Guardar reporte de ESLint
                            archiveArtifacts artifacts: 'eslint-report.xml', allowEmptyArchive: true
                        } catch (Exception e) {
                            echo "❌ Error en linting: ${e.toString()}"
                            currentBuild.result = 'UNSTABLE'
                        }
                    }
                }
            }
        }

        stage('Pruebas Unitarias') {
            steps {
                dir('src') {
                    script {
                        try {
                            sh "${env.UNIT_TEST_SCRIPT}"
                            // Guardar reportes de cobertura
                            junit '**/test-results.xml'
                            archiveArtifacts artifacts: 'coverage/**/*'
                        } catch (Exception e) {
                            echo "❌ Error en pruebas unitarias: ${e.toString()}"
                            currentBuild.result = 'UNSTABLE'
                        }
                    }
                }
            }
        }

        stage('Build Producción') {
            steps {
                dir('src') {
                    script {
                        try {
                            sh 'npm run build'
                            echo "✅ Build de producción completado"
                            archiveArtifacts artifacts: 'dist/**/*'
                        } catch (Exception e) {
                            echo "❌ Error en build: ${e.toString()}"
                            currentBuild.result = 'FAILURE'
                            error "Fallo en el build de producción"
                        }
                    }
                }
            }
        }

        stage('Despliegue') {
            when {
                expression { currentBuild.resultIsBetterOrEqualTo('SUCCESS') }
            }
            steps {
                dir('src') {
                    script {
                        try {
                            // Ejemplo para despliegue en servidor (ajustar según necesidades)
                            sh '''
                            # Detener aplicación si está corriendo
                            pm2 delete ${APP_NAME} || true
                            
                            # Iniciar aplicación
                            pm2 start dist/app.js --name ${APP_NAME} \
                                --env production \
                                --log /var/log/${APP_NAME}.log \
                                --output /var/log/${APP_NAME}-out.log \
                                --error /var/log/${APP_NAME}-err.log
                            
                            # Guardar configuración PM2
                            pm2 save
                            '''
                            
                            echo "🚀 Aplicación desplegada correctamente"
                        } catch (Exception e) {
                            echo "❌ Error en despliegue: ${e.toString()}"
                            currentBuild.result = 'FAILURE'
                            error "Fallo en el despliegue"
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                echo "🏁 Pipeline completado - Resultado: ${currentBuild.currentResult}"
                echo "⏱️ Duración: ${currentBuild.durationString}"
                
                // Limpieza
                cleanWs()
            }
        }
        
        success {
            slackSend(
                channel: env.SLACK_CHANNEL,
                color: "good",
                message: """✅ *${env.APP_NAME}* - Pipeline Exitoso
• *Build*: #${env.BUILD_NUMBER}
• *Nodo*: ${env.NODE_NAME}
• *Duración*: ${currentBuild.durationString}
• *Commit*: ${sh(returnStdout: true, script: 'cd src && git log -1 --pretty=%h')}"""
            )
        }
        
        failure {
            slackSend(
                channel: env.SLACK_CHANNEL,
                color: "danger",
                message: """❌ *${env.APP_NAME}* - Pipeline Fallido
• *Build*: #${env.BUILD_NUMBER}
• *Error*: ${currentBuild.currentResult}
• *Consulte*: ${env.BUILD_URL}"""
            )
        }
        
        unstable {
            slackSend(
                channel: env.SLACK_CHANNEL,
                color: "warning",
                message: """⚠️ *${env.APP_NAME}* - Pipeline Inestable
• *Build*: #${env.BUILD_NUMBER}
• *Razón*: Problemas en linting o pruebas
• *Detalles*: ${env.BUILD_URL}"""
            )
        }
    }
}