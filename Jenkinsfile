pipeline {
  agent any

  environment {
    REGISTRY_CREDENTIALS = 'dockerhub-creds'
    DOCKERHUB_USER = 'qlirimkastrati'
    DOCKER_REPO = 'node-app'
    K8S_NAMESPACE = 'devops-demo'
    IMAGE_NAME = "${DOCKERHUB_USER}/${DOCKER_REPO}"
    SHORT_SHA = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : 'latest'}"
    IMAGE_TAG = "${SHORT_SHA}"
    TEST_RESULTS_DIR = "test-results"
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build Docker Image') {
      steps {
        sh 'docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -t ${IMAGE_NAME}:latest .'
      }
    }

    stage('Run Tests') {
      steps {
        sh '''
          mkdir -p ${TEST_RESULTS_DIR}
          docker run --rm -e CI=true \
            -e JEST_JUNIT_OUTPUT=/test-results/junit.xml \
            -v "$PWD/${TEST_RESULTS_DIR}":/test-results \
            ${IMAGE_NAME}:${IMAGE_TAG} \
            sh -c "npm ci && npm test -- --ci --reporters=default --reporters=jest-junit"
        '''
      }
      post {
        always {
          junit testResults: "${TEST_RESULTS_DIR}/junit.xml", allowEmptyResults: true
        }
      }
    }

    stage('Push to DockerHub') {
      steps {
        withCredentials([usernamePassword(credentialsId: env.REGISTRY_CREDENTIALS, usernameVariable: 'USER', passwordVariable: 'PASS')]) {
          sh '''
            echo "$PASS" | docker login -u "$USER" --password-stdin
            docker push ${IMAGE_NAME}:${IMAGE_TAG}
            docker push ${IMAGE_NAME}:latest
            docker logout
          '''
        }
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        sh '''
          kubectl get ns ${K8S_NAMESPACE} || kubectl create ns ${K8S_NAMESPACE}
          kubectl -n ${K8S_NAMESPACE} apply -f k8s/
          kubectl -n ${K8S_NAMESPACE} set image deploy/node-app node-app=${IMAGE_NAME}:${IMAGE_TAG} --record=true || true
        '''
      }
    }
  }

  post {
    success { echo "✅ Successfully deployed ${IMAGE_NAME}:${IMAGE_TAG}" }
    failure { echo "❌ Pipeline failed." }
  }
}
