pipeline {
    agent {
        label 'nodejs-agent'
    }

    // Activador automático para cambios en master
    triggers {
        pollSCM('H/2 * * * *') // Revisa cada 2 minutos cambios en master
        // GitHubHookTrigger() // Descomentar si configuras webhook
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        timestamps()  // Agrega timestamps a los logs
    }

    environment {
        APP_NAME = "mi-app-js"
        NODE_VERSION = "18.x"
        REPO_URL = "https://github.com/Raulcudris/devops_Nodes.git"
        CREDENTIALS_ID = "github_id" // Asegúrate que este ID existe en Jenkins
        
        // Configuración de rutas
        DEPLOY_DIR = "/var/www/${APP_NAME}"
        LOG_DIR = "/var/log/${APP_NAME}"
        
        // Notificaciones
        SLACK_CHANNEL = "#dev-notifications"
    }

    stages {
        stage('Preparación') {
            steps {
                script {
                    echo "🚀 Iniciando CI/CD para ${APP_NAME}"
                    echo "🔗 Repositorio: ${REPO_URL}"
                    echo "🔄 Rama: master"
                    
                    // Verificación de herramientas
                    sh '''
                        echo "Node.js: $(node --version || echo '❌ No instalado')"
                        echo "npm: $(npm --version || echo '❌ No instalado')"
                        echo "Git: $(git --version || echo '❌ No instalado')"
                        echo "PM2: $(pm2 --version || echo '❌ No instalado')"
                    '''
                }
            }
        }

        stage('Checkout Código') {
            steps {
                script {
                    try {
                        checkout([
                            $class: 'GitSCM',
                            branches: [[name: 'master']],
                            extensions: [
                                [$class: 'CleanBeforeCheckout'],
                                [$class: 'CloneOption', depth: 1, shallow: true],
                                [$class: 'RelativeTargetDirectory', relativeTargetDir: 'src']
                            ],
                            userRemoteConfigs: [[
                                url: "${env.REPO_URL}",
                                credentialsId: "${env.CREDENTIALS_ID}"
                            ]]
                        ])
                        
                        // Obtener información del commit
                        COMMIT_HASH = sh(returnStdout: true, script: 'cd src && git rev-parse --short HEAD').trim()
                        COMMIT_MESSAGE = sh(returnStdout: true, script: 'cd src && git log -1 --pretty=%B').trim()
                        COMMIT_AUTHOR = sh(returnStdout: true, script: 'cd src && git log -1 --pretty=%an').trim()
                        
                        echo "📌 Commit: ${COMMIT_HASH}"
                        echo "👤 Autor: ${COMMIT_AUTHOR}"
                        echo "💬 Mensaje: ${COMMIT_MESSAGE}"
                    } catch (Exception e) {
                        error "❌ Fallo en checkout: ${e.getMessage()}"
                    }
                }
            }
        }

        stage('Configurar Entorno') {
            steps {
                script {
                    withEnv(["PATH+NODE=${tool 'NodeJS'}/bin"]) {
                        sh 'node --version'
                        sh 'npm config set registry https://registry.npmjs.org/'
                    }
                }
            }
        }

        stage('Instalar Dependencias') {
            steps {
                dir('src') {
                    script {
                        try {
                            cache([$class: 'ArbitraryFileCache', path: 'node_modules/']) {
                                sh 'npm ci --prefer-offline --no-audit'
                            }
                            echo "✅ Dependencias instaladas"
                        } catch (Exception e) {
                            echo "⚠️ Falló npm ci, intentando npm install..."
                            sh 'npm install --no-audit'
                        }
                    }
                }
            }
        }

        stage('Linting') {
            steps {
                dir('src') {
                    script {
                        try {
                            sh 'npm run lint'
                            archiveArtifacts artifacts: 'eslint-report.xml', allowEmptyArchive: true
                        } catch (Exception e) {
                            echo "⚠️ Problemas de linting"
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
                            sh "npm test -- --ci --reporters=default --reporters=jest-junit"
                            junit '**/junit.xml'
                            archiveArtifacts artifacts: 'coverage/**/*'
                        } catch (Exception e) {
                            echo "❌ Fallaron las pruebas"
                            currentBuild.result = 'UNSTABLE'
                        }
                    }
                }
            }
        }

        stage('Build Producción') {
            when {
                expression { currentBuild.resultIsBetterOrEqualTo('UNSTABLE') }
            }
            steps {
                dir('src') {
                    script {
                        try {
                            sh 'npm run build'
                            archiveArtifacts artifacts: 'dist/**/*'
                            echo "✅ Build completado"
                        } catch (Exception e) {
                            error "❌ Fallo en build: ${e.getMessage()}"
                        }
                    }
                }
            }
        }

        stage('Despliegue') {
            when {
                expression { currentBuild.resultIsBetterOrEqualTo('UNSTABLE') }
            }
            steps {
                dir('src') {
                    script {
                        try {
                            sh """
                            # Crear directorios si no existen
                            sudo mkdir -p ${env.DEPLOY_DIR} ${env.LOG_DIR}
                            sudo chown -R jenkins:jenkins ${env.DEPLOY_DIR} ${env.LOG_DIR}
                            
                            # Copiar archivos
                            rsync -avz --delete dist/ ${env.DEPLOY_DIR}/
                            
                            # Instalar dependencias de producción
                            cd ${env.DEPLOY_DIR} && npm ci --only=production
                            
                            # Gestionar aplicación con PM2
                            pm2 delete ${env.APP_NAME} || true
                            pm2 start ${env.DEPLOY_DIR}/app.js \
                                --name ${env.APP_NAME} \
                                --env production \
                                --log ${env.LOG_DIR}/app.log \
                                --output ${env.LOG_DIR}/out.log \
                                --error ${env.LOG_DIR}/error.log \
                                --time
                            pm2 save
                            pm2 list
                            """
                            echo "🚀 Aplicación desplegada"
                        } catch (Exception e) {
                            error "❌ Fallo en despliegue: ${e.getMessage()}"
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                echo "🏁 Pipeline ${currentBuild.currentResult}"
                echo "⏱ Duración: ${currentBuild.durationString}"
                cleanWs()
            }
        }
        
        success {
            slackSend(
                channel: env.SLACK_CHANNEL,
                color: "good",
                message: """✅ *${env.APP_NAME}* - Despliegue Exitoso
• Versión: #${env.BUILD_NUMBER}
• Commit: ${env.COMMIT_HASH}
• Autor: ${env.COMMIT_AUTHOR}
• Mensaje: ${env.COMMIT_MESSAGE}
• Detalles: ${env.BUILD_URL}"""
            )
        }
        
        failure {
            slackSend(
                channel: env.SLACK_CHANNEL,
                color: "danger",
                message: """❌ *${env.APP_NAME}* - Pipeline Fallido
• Build: #${env.BUILD_NUMBER}
• Error: ${currentBuild.currentResult}
• Commit: ${env.COMMIT_HASH}
• Consulte: ${env.BUILD_URL}"""
            )
        }
    }
}