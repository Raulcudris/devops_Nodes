pipeline{
    agent any

    tools {
        nodejs "NodeJs" // Nombre de tu instalacion
    }

    environment {
        APP_NAME = "node-backend"
        NODE_ENV = "production"
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'master', url: 'https://github.com/Raulcudris/devops_Nodes.git'
            }
        }
    

   
        stage('Instalar dependencias') {
            steps {
                sh 'npm install'
            }
        }
    

    
        stage('Pruebas unitarias') {
            steps {
                sh 'npm test'
            }
        }
    

     
        stage('Pruebas unitarias') {
            steps {
                sh 'npm test'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Desplegar') {
            steps {
                sh '''
                pm2 stop ${APP_NAME} || true
                pm2 start app.js --name ${APP_NAME}
                '''
            }
        }


    }
    post {
        success {
            slackSend color: "good" , message: "Pipeline exitoso: ${env.JOB_NAME} - Build #${env.BUILD_NUMBER}"
        }
        failure {
            slackSend color: "danger" , message: "Pipeline fallido: ${env.JOB_NAME} - Build #${env.BUILD_NUMBER}"
        }

    }

}