FROM fedora:44 as nsjail-builder
# Install dependencies (Debian/Ubuntu)
# sh-5.3# dnf install autoconf bison flex gcc g++ git protobuf libnl3-devel libtool make pkg-config protobuf-compiler

RUN dnf install autoconf bison flex gcc g++ git protobuf-devel libnl3-devel libtool make pkg-config protobuf-compiler -y
RUN git clone https://github.com/google/nsjail.git && \
    cd nsjail && \
    make -j$(nproc)

FROM fedora:44

ENV APP_DIR=/app
WORKDIR /app

COPY --from=nsjail-builder /nsjail/nsjail /usr/sbin/nsjail

# install system dependencies
RUN dnf install unzip git g++ python3.15 pip protobuf-devel libnl3-devel -y

# install c++ dependencies
RUN git clone --depth 1 --branch v7.1.0 \
    https://github.com/stephenberry/glaze.git /tmp/glaze && \
    cp -r /tmp/glaze/include/glaze /usr/include/ && \
    rm -rf /tmp/glaze

# install python dependencies
RUN pip install sortedcontainers

# cleanup
RUN dnf remove git pip -y && dnf clean all -y

COPY . .

ENV CPP_DIR="${APP_DIR}/drivers/cpp26"
ENV CPP_SYSTEM_H="${CPP_DIR}/include/system.h"
ENV CXXFLAGS_BASE="-O3 -std=gnu++23"
ENV CXXFLAGS="${CXXFLAGS_BASE} -include ${CPP_SYSTEM_H}"

# pre copmile header
RUN g++ -x c++-header ${CXXFLAGS_BASE} ${CPP_SYSTEM_H}


# start http service
RUN curl -fsSL https://bun.com/install | bash;mv /root/.bun/bin/* -t /usr/sbin
RUN bun build index.ts --target bun --outdir .
RUN cd $APP_DIR;rm -rf node_modules src .dockerignore .gitignore Dockerfile index.ts package.json README.md tsconfig.json


# CMD ["bun", "run", "index.js"]
CMD ["bun", "run", "index.js"]
