FROM centos:7.6.1810 AS deps

# install tools
RUN yum install -y \
  git \
  java-1.8.0-openjdk-devel \
  wget \
  unzip

# export JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/java

# download gradle
ARG GRADLE_VERSION=4.10.3
WORKDIR /opt/gradle
RUN wget https://downloads.gradle.org/distributions/gradle-$GRADLE_VERSION-bin.zip
RUN unzip gradle-$GRADLE_VERSION-bin.zip
RUN rm -f gradle-$GRADLE_VERSION-bin.zip
RUN ln -s /opt/gradle/gradle-$GRADLE_VERSION /opt/gradle/default
ENV GRADLE_HOME=/opt/gradle/default
ENV PATH=$PATH:$GRADLE_HOME/bin

# build ohara
ARG GIT_USER=""
ARG GIT_PWD=""
ARG BRANCH="master"
WORKDIR /testpatch/ohara
RUN git clone --single-branch -b $BRANCH https://$GIT_USER:$GIT_PWD@bitbucket.org/is-land/ohara.git /testpatch/ohara
RUN gradle clean build -x test -PskipManager
RUN mkdir /opt/ohara
RUN tar -xvf $(find "/testpatch/ohara/ohara-assembly/build/distributions" -maxdepth 1 -type f -name "*.tar") -C /opt/ohara/

# remove manager
RUN rm -rf $(find "/opt/ohara/" -maxdepth 1 -type d -name "ohara-*")/manager

# Add Tini
ARG TINI_VERSION=v0.18.0
RUN wget https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini -O /tini

FROM centos:7.6.1810

# install tools
RUN yum install -y \
  java-1.8.0-openjdk

# export JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/jre

# add user
ARG USER=configurator
RUN groupadd $USER
RUN useradd -ms /bin/bash -g $USER $USER

# clone ohara binary
COPY --from=deps /opt/ohara /home/$USER
RUN ln -s $(find "/home/$USER/" -maxdepth 1 -type d -name "ohara-*") /home/$USER/default
ENV OHARA_HOME=/home/$USER/default
ENV PATH=$PATH:$OHARA_HOME/bin

# clone Tini
COPY --from=deps /tini /tini
RUN chmod +x /tini

# change to user
USER $USER

ENTRYPOINT ["/tini", "--", "ohara", "start", "configurator"]