pipeline {
    agent any

    // Configuración de herramientas globales
    tools {
        nodejs 'NodeJS' // Nombre de la instalación de Node.js en Jenkins
    }

    // Variables de entorno con valores por defecto
    environment {
        APP_NAME = 'node-backend'
        NODE_ENV = 'production'
        REPO_URL = 'https://github.com/Raulcudris/devops_Nodes.git'
        REPO_CREDENTIALS = 'github_id' // ID de tus credenciales en Jenkins
        SLACK_CHANNEL = '#jenkins-notifications'
    }

    // Parámetros configurables desde la UI de Jenkins
    parameters {
        string(name: 'DEPLOY_ENV', defaultValue: 'staging', description: 'Entorno de despliegue')
        choice(name: 'NODE_VERSION', choices: ['18.x', '20.x'], description: 'Versión de Node.js')
        booleanParam(name: 'RUN_TESTS', defaultValue: true, description: 'Ejecutar pruebas unitarias')
    }

    stages {
        stage('Validación inicial') {
            steps {
                script {
                    // Validación de variables críticas
                    if (!env.REPO_URL?.trim()) {
                        error 'REPO_URL no está configurado'
                    }

                    if (!env.REPO_CREDENTIALS?.trim()) {
                        error 'REPO_CREDENTIALS no está configurado'
                    }

                    echo '=========================================='
                    echo "Iniciando pipeline para ${env.APP_NAME}"
                    echo "Node.js version: ${env.NODE_VERSION}"
                    echo "Repositorio: ${env.REPO_URL}"
                    echo "Entorno: ${params.DEPLOY_ENV}"
                    echo '=========================================='
                }
            }
        }

        stage('Checkout') {
            steps {
                script {
                    try {
                        checkout([
                    $class: 'GitSCM',
                    branches: [[name: 'master']],
                    extensions: [
                        [$class: 'CleanCheckout'],
                        [$class: 'CloneOption', depth: 1, noTags: false, shallow: true]
                    ],
                    userRemoteConfigs: [[
                        url: env.REPO_URL,
                        credentialsId: env.REPO_CREDENTIALS,
                        refspec: '+refs/heads/*:refs/remotes/origin/*'
                    ]]
                ])
            } catch (Exception e) {
                        error "Error en checkout: ${e.getMessage()}"
                    }
                }
            }
        }

        stage('Instalar dependencias') {
            steps {
                script {
                    try {
                        sh 'npm install'
                        echo '✅ Dependencias instaladas correctamente'
                    } catch (Exception e) {
                        echo "❌ Error instalando dependencias: ${e.toString()}"
                        currentBuild.result = 'FAILURE'
                        error 'Falló la instalación de dependencias'
                    }
                }
            }
        }

        stage('Pruebas unitarias') {
            when {
                expression { params.RUN_TESTS.toBoolean() }
            }
            steps {
                script {
                    try {
                        sh 'npm test'
                        echo '✅ Pruebas unitarias exitosas'
                    } catch (Exception e) {
                        echo "❌ Fallaron las pruebas unitarias: ${e.toString()}"
                        currentBuild.result = 'UNSTABLE'
                        error 'Las pruebas unitarias fallaron'
                    }
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    try {
                        sh 'npm run build'
                        echo '✅ Build completado exitosamente'
                    } catch (Exception e) {
                        echo "❌ Error en el build: ${e.toString()}"
                        currentBuild.result = 'FAILURE'
                        error 'Falló el proceso de build'
                    }
                }
            }
        }

        stage('Desplegar') {
            steps {
                script {
                    try {
                        sh """
                        pm2 stop ${env.APP_NAME} || true
                        pm2 start app.js --name ${env.APP_NAME} --env ${params.DEPLOY_ENV}
                        """
                        echo '✅ Aplicación desplegada correctamente'
                    } catch (Exception e) {
                        echo "❌ Error en despliegue: ${e.toString()}"
                        currentBuild.result = 'FAILURE'
                        error 'Falló el despliegue de la aplicación'
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                echo "Pipeline completado - Resultado: ${currentBuild.currentResult}"
                cleanWs() // Limpiar workspace
            }
        }
        success {
            slackSend(
                channel: env.SLACK_CHANNEL,
                color: 'good',
                message: "✅ Pipeline exitoso: ${env.JOB_NAME} (#${env.BUILD_NUMBER})\n" +
                         "Estado: ${currentBuild.currentResult}\n" +
                         "URL: ${env.BUILD_URL}"
            )
        }
        failure {
            slackSend(
                channel: env.SLACK_CHANNEL,
                color: 'danger',
                message: "❌ Pipeline fallido: ${env.JOB_NAME} (#${env.BUILD_NUMBER})\n" +
                         "Estado: ${currentBuild.currentResult}\n" +
                         "URL: ${env.BUILD_URL}\n" +
                         'Consulte los logs para más detalles'
            )
        }
        unstable {
            slackSend(
                channel: env.SLACK_CHANNEL,
                color: 'warning',
                message: "⚠️ Pipeline inestable: ${env.JOB_NAME} (#${env.BUILD_NUMBER})\n" +
                         "Estado: ${currentBuild.currentResult}\n" +
                         "URL: ${env.BUILD_URL}\n" +
                         'Posibles fallas en pruebas unitarias'
            )
        }
    }
}
